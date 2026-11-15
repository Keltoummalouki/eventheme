"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { matches } from "@/lib/eventheme/dashboard";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { SearchIcon } from "@/components/ui/icons";
import { ReturnIcon } from "./icons";
import s from "./Admin.module.css";

export type PaletteItem = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  /** Mots supplémentaires pour la recherche (référence, e-mail, ville…). */
  keywords?: string;
  /** Visible seulement lorsqu'une recherche est saisie (demandes, fiches). */
  searchOnly?: boolean;
  run: () => void;
};

/** Résultats par groupe : assez pour choisir, jamais une liste interminable. */
const PER_GROUP = 6;

/**
 * Palette de commandes (Ctrl K ou ⌘ K) : aller à un onglet, lancer une action,
 * retrouver une demande ou une fiche. Boîte de dialogue native (focus piégé,
 * Échap), champ en combobox, options parcourues aux flèches.
 */
export default function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const id = useId().replace(/[^\w-]/g, "");

  const groups = useMemo(() => {
    const searching = query.trim() !== "";
    const found = items.filter(
      (item) => (searching || !item.searchOnly) && matches(query, item.label, item.hint, item.keywords, item.group),
    );
    const byGroup = new Map<string, PaletteItem[]>();
    for (const item of found) {
      const group = byGroup.get(item.group) ?? [];
      if (group.length < PER_GROUP) byGroup.set(item.group, [...group, item]);
    }
    // `start` : rang de la première option du groupe dans la liste complète.
    return [...byGroup].reduce<{ group: string; entries: PaletteItem[]; start: number }[]>((all, [group, entries]) => {
      const previous = all[all.length - 1];
      return [...all, { group, entries, start: previous ? previous.start + previous.entries.length : 0 }];
    }, []);
  }, [items, query]);
  const flat = useMemo(() => groups.flatMap(({ entries }) => entries), [groups]);
  const current = Math.min(active, Math.max(0, flat.length - 1));

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      input.current?.focus();
      if (!prefersReducedMotion())
        gsap.fromTo(node, { opacity: 0, y: -12, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "power3.out" });
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  // L'option active reste visible quand on la parcourt au clavier.
  useEffect(() => {
    list.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  function choose(item: PaletteItem | undefined) {
    if (!item) return;
    onClose();
    setQuery("");
    setActive(0);
    item.run();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const moves: Record<string, () => number> = {
      ArrowDown: () => (current + 1) % Math.max(1, flat.length),
      ArrowUp: () => (current - 1 + flat.length) % Math.max(1, flat.length),
      Home: () => 0,
      End: () => flat.length - 1,
    };
    if (event.key === "Enter") {
      event.preventDefault();
      choose(flat[current]);
    } else if (moves[event.key] && flat.length) {
      event.preventDefault();
      setActive(moves[event.key]());
    }
  }

  return (
    <dialog
      ref={dialog}
      className={s.palette}
      aria-label="Rechercher ou aller à"
      onClose={() => {
        setQuery("");
        setActive(0);
        onClose();
      }}
      onClick={(event) => {
        // Un clic sur le voile (hors du panneau) ferme la palette.
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className={s.paletteBox}>
        <label className={s.paletteSearch}>
          <SearchIcon />
          <span className="visually-hidden">Rechercher une page, une action, une demande ou une fiche</span>
          <input
            ref={input}
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={flat.length ? `${id}-option-${current}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder="Rechercher une page, une demande, un matériel…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <kbd>Échap</kbd>
        </label>
        <div ref={list} id={`${id}-list`} role="listbox" aria-label="Résultats" className={s.paletteList}>
          {groups.map(({ group, entries, start }, groupIndex) => (
            <div key={group} role="group" aria-labelledby={`${id}-group-${groupIndex}`}>
              <span id={`${id}-group-${groupIndex}`} className={s.paletteGroup}>
                {group}
              </span>
              {entries.map((item, itemIndex) => {
                const position = start + itemIndex;
                return (
                  <div
                    key={item.id}
                    id={`${id}-option-${position}`}
                    data-index={position}
                    role="option"
                    aria-selected={position === current}
                    className={s.paletteOption}
                    onPointerMove={() => position !== current && setActive(position)}
                    onClick={() => choose(item)}
                  >
                    <span className={s.paletteIcon}>{item.icon}</span>
                    <span className={s.paletteText}>
                      <b>{item.label}</b>
                      {item.hint && <small>{item.hint}</small>}
                    </span>
                    {position === current && <ReturnIcon className={s.paletteReturn} />}
                  </div>
                );
              })}
            </div>
          ))}
          {!flat.length && <p className={s.paletteEmpty}>Aucun résultat pour « {query} ».</p>}
        </div>
        <p className={s.paletteFoot} aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> parcourir
          </span>
          <span>
            <kbd>Entrée</kbd> ouvrir
          </span>
          <span>
            <kbd>Ctrl</kbd>
            <kbd>K</kbd> ouvrir ou fermer
          </span>
        </p>
      </div>
    </dialog>
  );
}
