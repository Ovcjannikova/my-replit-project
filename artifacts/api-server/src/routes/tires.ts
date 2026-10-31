import { Router } from "express";

const router = Router();

router.get("/tires", async (req, res) => {
  const mockTires = {
    source: "demo",
    fetchedAt: new Date().toISOString(),
    products: [
      {
        id: "ovation-vi-702",
        brand: "OVATION",
        model: "VI-702",
        country: "Импортная",
        size: "7.50R16",
        width: "7.50 MM",
        profile: "0%",
        diameter: "16",
        axle: "Универсальная",
        speed: "M",
        load: "122/118",
        price: 10657,
        availability: "В наличии",
        imageUrl: null
      },
      {
        id: "ovation-vi-660-215",
        brand: "OVATION",
        model: "VI-660",
        country: "Импортная",
        size: "215/75R17.5",
        width: "215 MM",
        profile: "75%",
        diameter: "17.5",
        axle: "Рулевая/Прицепная",
        speed: "J",
        load: "135/133",
        price: 11101,
        availability: "В наличии",
        imageUrl: null
      },
      {
        id: "ovation-vi-660-315",
        brand: "OVATION",
        model: "VI-660",
        country: "Импортная",
        size: "315/70R22.5",
        width: "315 MM",
        profile: "70%",
        diameter: "22.5",
        axle: "Рулевая",
        speed: "L/M",
        load: "154/150",
        price: 21313,
        availability: "В наличии",
        imageUrl: null
      },
      {
        id: "ovation-vi-638",
        brand: "OVATION",
        model: "VI-638",
        country: "Импортная",
        size: "11R22.5",
        width: "11 MM",
        profile: "0%",
        diameter: "22.5",
        axle: "Ведущая",
        speed: "M",
        load: "148/145",
        price: 23144,
        availability: "В наличии",
        imageUrl: null
      }
    ]
  };
  
  res.json(mockTires);
});

export default router;