process.on('unhandledRejection', (err: any) => {
  if (err?.name === 'TimeoutError' || err?.constructor?.name === 'TimeoutError') return;
  throw err;
});
