import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Truck } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  onDone?: () => void;
};

export function ShippedModal({ open, onOpenChange, offerId, onDone }: Props) {
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("mark_offer_shipped", {
      _offer_id: offerId,
      _carrier: carrier || null,
      _tracking: tracking || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marqué comme expédié — acheteur notifié");
    setCarrier("");
    setTracking("");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck size={20} /> Marquer comme expédié
          </DialogTitle>
          <DialogDescription>
            Renseigne le transporteur et le numéro de suivi (facultatifs). L'acheteur sera
            prévenu immédiatement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="carrier">Transporteur (facultatif)</Label>
            <Input
              id="carrier"
              placeholder="Colissimo, Chronopost, Mondial Relay…"
              maxLength={50}
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="tracking">Numéro de suivi (facultatif)</Label>
            <Input
              id="tracking"
              placeholder="ex. AB123456789FR"
              maxLength={100}
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : "Confirmer l'envoi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
