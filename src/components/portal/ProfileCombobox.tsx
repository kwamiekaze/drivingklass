import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Profile } from "@/types/portal";
import { getDisplayName } from "@/lib/profileUtils";

interface ProfileComboboxProps {
  people: Profile[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyText?: string;
}

/** Searchable, keyboard-friendly picker for a profile (student / instructor). */
export function ProfileCombobox({
  people,
  value,
  onChange,
  disabled,
  placeholder = "Select…",
  emptyText = "No results found",
}: ProfileComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () =>
      [...people].sort((a, b) =>
        getDisplayName(a, "zzz").localeCompare(getDisplayName(b, "zzz"), undefined, { sensitivity: "base" })
      ),
    [people]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((p) => {
      const haystack = [
        getDisplayName(p, ""),
        p.first_name || "",
        p.last_name || "",
        p.full_name || "",
        p.email || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sorted, query]);

  const selected = people.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full min-h-[44px] justify-between font-normal text-left"
        >
          <span className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 shrink-0 text-primary" />
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? getDisplayName(selected, "Unknown") : placeholder}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[min(92vw,420px)] bg-popover z-[70] shadow-2xl"
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email…"
            value={query}
            onValueChange={setQuery}
            autoFocus
            className="h-12 text-base"
          />
          <CommandList className="max-h-[45vh] sm:max-h-[320px] overscroll-contain scroll-smooth">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filtered.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="cursor-pointer py-3 min-h-[44px]"
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value === p.id ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0">
                    <span className="block text-sm leading-snug truncate">{getDisplayName(p, "Unknown")}</span>
                    {p.email && (
                      <span className="block text-xs text-muted-foreground truncate">{p.email}</span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
