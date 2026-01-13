import { MapPin, Copy, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SessionAddressSectionProps {
  pickupAddress: string | null;
  dropoffAddress: string | null;
}

export function SessionAddressSection({ pickupAddress, dropoffAddress }: SessionAddressSectionProps) {
  const { toast } = useToast();

  const copyToClipboard = async (address: string, label: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const openInMaps = (address: string) => {
    // Check if iOS for Apple Maps, otherwise use Google Maps
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const encodedAddress = encodeURIComponent(address);
    
    if (isIOS) {
      window.open(`maps://maps.apple.com/?address=${encodedAddress}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  };

  const hasAddresses = pickupAddress || dropoffAddress;

  if (!hasAddresses) {
    return (
      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-sm font-medium flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4" />
          Missing Addresses
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          No pickup/drop-off address on file. Ask the student to complete their intake form.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs sm:text-sm font-medium flex items-center gap-2 text-muted-foreground">
        <MapPin className="h-4 w-4" />
        Addresses
      </p>
      
      <div className="space-y-2">
        {/* Pickup Address */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pickup</p>
              <p className="text-sm font-medium break-words">
                {pickupAddress || <span className="text-muted-foreground italic">Not provided</span>}
              </p>
            </div>
            {pickupAddress && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(pickupAddress, "Pickup address")}
                  title="Copy address"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openInMaps(pickupAddress)}
                  title="Open in Maps"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Dropoff Address */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Drop-off</p>
              <p className="text-sm font-medium break-words">
                {dropoffAddress || <span className="text-muted-foreground italic">Not provided</span>}
              </p>
            </div>
            {dropoffAddress && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(dropoffAddress, "Drop-off address")}
                  title="Copy address"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openInMaps(dropoffAddress)}
                  title="Open in Maps"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
