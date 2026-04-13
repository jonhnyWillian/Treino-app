import express from "express";
import cors from "cors";
import { getConnection } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import workoutRoutes from "./routes/workoutRoutes.js";

const app = express();

app.use(cors()); 
app.use(express.json());

// conecta no banco
await getConnection();

app.use("/users", userRoutes);
app.use("/workouts", workoutRoutes);


app.get("/", (req, res) => {
  res.send("API rodando 🚀");
});

app.listen(3001, () => {
  console.log("Servidor rodando na porta 3001");
});

