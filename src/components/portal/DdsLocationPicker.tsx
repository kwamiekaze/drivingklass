import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { DDS_LOCATIONS } from "@/lib/ddsLocations";

interface Props {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}

export function DdsLocationPicker({ value, onChange, placeholder = "Search DDS testing location…" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DDS_LOCATIONS;
    return DDS_LOCATIONS.filter(l => l.toLowerCase().includes(q));
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full min-h-[44px] justify-between font-normal text-left"
        >
          <span className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || placeholder}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[min(96vw,560px)] bg-popover z-50 shadow-2xl"
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type a city, street, or ZIP…"
            value={query}
            onValueChange={setQuery}
            autoFocus
            className="h-12 text-base"
          />
          <CommandList className="max-h-[60vh] sm:max-h-[380px] overscroll-contain">
            <CommandEmpty>No DDS location found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((loc) => (
                <CommandItem
                  key={loc}
                  value={loc}
                  onSelect={() => {
                    onChange(loc);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="cursor-pointer py-3 min-h-[48px]"
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value === loc ? "opacity-100" : "opacity-0")} />
                  <span className="text-sm leading-snug break-words">{loc}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
