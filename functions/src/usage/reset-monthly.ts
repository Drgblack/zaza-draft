import * as functions from 'firebase-functions';
import { dbAdmin } from '@/lib/firebase/admin';

export const resetMonthlyUsage = functions.pubsub
  .schedule('0 0 1 * *')  // Run at midnight on first of each month
  .timeZone('UTC')
  .onRun(async (context) => {
    const batchSize = 500;
    const now = new Date();
    const stats = { processed: 0, reset: 0, errors: 0 };
    
    try {
      // Get all users (paginated in batches)
      const usersRef = dbAdmin.collection('users');
      let lastDoc = null;

      while (true) {
        let query = usersRef.limit(batchSize);
        if (lastDoc) query = query.startAfter(lastDoc);

        const snapshot = await query.get();
        if (snapshot.empty) break;
        
        for (const doc of snapshot.docs) {
          stats.processed++;
          const data = doc.data();
          
          // Skip if already reset this month
          if (data.lastResetAt?.toDate?.()) {
            const lastReset = data.lastResetAt.toDate();
            if (lastReset.getUTCMonth() === now.getUTCMonth() && 
                lastReset.getUTCFullYear() === now.getUTCFullYear()) {
              continue;
            }
          }

          try {
            await doc.ref.update({
              'usage.snippetsThisMonth': 0,
              'lastResetAt': now,
              updatedAt: now,
            });
            stats.reset++;
          } catch (e) {
            console.error(`Failed to reset usage for user ${doc.id}:`, e);
            stats.errors++;
          }
        }

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
      }

      console.log('Monthly usage reset complete:', {
        ...stats,
        timestamp: now.toISOString(),
      });

      return stats;
    } catch (e) {
      console.error('Monthly usage reset failed:', e);
      throw e;
    }
  });