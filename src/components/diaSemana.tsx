"use client";

import React, { useState } from "react";
import { Button, Typography, Box } from "@mui/material";

type Dia = (typeof dias)[number];

interface DiaSemanaProps {
  onSelectDia: (dia: Dia) => void;
  value?: Dia | null;
  defaultValue?: Dia | null;
}

const dias = [
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
  "Dom",
] as const;

export default function DiaSemana({
  onSelectDia,
  value,
  defaultValue = null,
}: DiaSemanaProps) {
  const isControlled = value !== undefined;
  const [internalSelected, setInternalSelected] = useState<Dia | null>(
    defaultValue
  );

  const selected = isControlled ? value : internalSelected;

  const handleSelect = (dia: Dia) => {
    if (!isControlled) setInternalSelected(dia);
    onSelectDia(dia);
  };

  return (
    <Box>
      {/* Título */}
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        Escolha o dia de treino
      </Typography>

      {/* Grid de dias */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1.5,
        }}
      >
        {dias.map((dia) => {
          const isActive = selected === dia;

          return (
            <Button
              key={dia}
              onClick={() => handleSelect(dia)}
              aria-pressed={isActive}
              variant={isActive ? "contained" : "outlined"}
              sx={{
                py: 1.5,
                borderRadius: 3,
                fontWeight: "bold",
                transition: "all 0.2s ease",

                ...(isActive
                  ? {
                      background:
                        "linear-gradient(45deg, #22c55e, #4ade80)",
                      color: "#fff",
                      transform: "scale(1.05)",
                    }
                  : {
                      borderColor: "#334155",
                      color: "#cbd5f5",
                    }),
              }}
            >
              {dia}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}