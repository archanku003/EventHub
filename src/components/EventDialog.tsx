import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Event } from "../lib/types";

interface EventDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  event: Event;
}

export function EventDialog({ open, setOpen, event }: EventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        {/* Remove the image below */}
        {/* <img src={event.imageUrl} alt={event.title} className="w-full h-48 object-cover rounded-md mb-4" /> */}
        <h2 className="text-xl font-bold mb-2">{event.title}</h2>
        {/* ...existing code for event details... */}
      </DialogContent>
    </Dialog>
  );
}