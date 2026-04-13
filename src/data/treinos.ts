export type TipoTreino = "inferior" | "superior";

export type GrupoInferior =
  | "quadriceps"
  | "posterior"
  | "gluteo"
  | "panturrilha";

export type GrupoSuperior =
  | "peito"
  | "costas"
  | "ombro"
  | "biceps"
  | "triceps";

export const treinos = {
  inferior: {
    quadriceps: [
      "Agachamento livre",
      "Leg press",
      "Cadeira extensora",
      "Afundo",
    ],
    posterior: [
      "Mesa flexora",
      "Stiff",
      "Levantamento terra",
    ],
    gluteo: [
      "Hip thrust",
      "Glute bridge",
      "Coice no cabo",
    ],
    panturrilha: [
      "Panturrilha em pé",
      "Panturrilha sentado",
    ],
  },

  superior: {
    peito: [
      "Supino reto",
      "Supino inclinado",
      "Crucifixo",
    ],
    costas: [
      "Puxada frente",
      "Remada curvada",
      "Remada baixa",
    ],
    ombro: [
      "Desenvolvimento",
      "Elevação lateral",
      "Elevação frontal",
    ],
    biceps: [
      "Rosca direta",
      "Rosca alternada",
      "Rosca martelo",
    ],
    triceps: [
      "Tríceps corda",
      "Tríceps testa",
      "Mergulho",
    ],
  },
};