import React from "react";
import { DOHA_FLAG_COLOR } from "../../util";

interface FilterTagsProps {
  items?: string[];
  onToggle: (item: string) => void;
}

export const FilterTags: React.FC<FilterTagsProps> = ({ items, onToggle }) => {
  if (!items || items.length === 0) return null;

  return (
    <>
      {items.map((item) => (
        <div
          key={item}
          style={{
            pointerEvents: "auto",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
          onClick={() => onToggle(item)}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: DOHA_FLAG_COLOR,
            }}
          />

          <p
            style={{
              fontSize: "12px",
              margin: 0,
              padding: 0,
            }}
          >
            {item}
          </p>
        </div>
      ))}
    </>
  );
};