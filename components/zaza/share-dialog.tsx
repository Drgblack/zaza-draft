"use client"

import { useState, useEffect } from "react"
import { Copy, ExternalLink, Lock, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLocale } from "@/hooks/use-locale"
import { FaWhatsapp, FaFacebook } from "react-icons/fa"
import { Mail } from "lucide-react"
import { ShareButton } from "./share-button"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  docId: string
}

export function ShareDialog({ open, onOpenChange, title, docId }: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const { t } = useLocale()

  useEffect(() => {
    const url = `${window.location.origin}/share/${docId}`
    setShareUrl(url)
  }, [docId])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Check out this document: ${title}`,
          url: shareUrl,
        })
      } catch (err) {
        console.error("Error sharing:", err)
      }
    }
  }

  const handleQuickShare = (platform: "whatsapp" | "email" | "facebook") => {
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedTitle = encodeURIComponent(title)

    const urls = {
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    }

    window.open(urls[platform], "_blank", "noopener,noreferrer")
  }

  return (
    <>
      {copied && (
        <div className="fixed top-20 right-4 bg-foreground text-background px-4 py-2 rounded-[14px] shadow-lg copied-toast z-50">
          {t("linkCopied")}
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-[14px]">
          <DialogHeader>
            <DialogTitle>{t("shareTitle")}</DialogTitle>
            <DialogDescription>{t("shareDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly className="flex-1 rounded-[14px]" />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyLink}
                aria-label={t("copyLink")}
                className="rounded-[14px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-transparent"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleCopyLink} className="w-full rounded-[14px]">
                <Copy className="h-4 w-4 mr-2" />
                {t("copyLink")}
              </Button>
              <Button
                onClick={() => window.open(shareUrl, "_blank")}
                variant="outline"
                className="w-full rounded-[14px]"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("openInNewTab")}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("quickShare")}</p>
              <div className="grid grid-cols-4 gap-2">
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <ShareButton brand="generic" Icon={Share2} label={t("shareVia")} onClick={handleWebShare} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{t("shareVia")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <ShareButton
                          brand="whatsapp"
                          Icon={FaWhatsapp}
                          label={t("shareWhatsApp")}
                          onClick={() => handleQuickShare("whatsapp")}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t("shareWhatsApp")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <ShareButton
                          brand="email"
                          Icon={Mail}
                          label={t("shareEmail")}
                          onClick={() => handleQuickShare("email")}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t("shareEmail")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <ShareButton
                          brand="facebook"
                          Icon={FaFacebook}
                          label={t("shareFacebook")}
                          onClick={() => handleQuickShare("facebook")}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t("shareFacebook")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">{t("sharePrivacy")}</p>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="w-full rounded-[14px] bg-transparent" disabled>
                    <Lock className="h-4 w-4 mr-2" />
                    {t("manageAccess")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("comingSoon")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
