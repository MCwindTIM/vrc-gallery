import { Router } from "express";
import {
  filterPhotos,
  getStats,
  loadCatalog,
  paginate,
} from "../services/photoCatalog.js";

export const photosRouter = Router();

photosRouter.get("/stats", async (_req, res, next) => {
  try {
    const catalog = await loadCatalog();
    const { photos } = catalog;
    const { months, total, latestDate } = getStats(photos);
    res.json({
      total,
      months,
      latestDate,
      updatedAt: catalog.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

photosRouter.get("/", async (req, res, next) => {
  try {
    const { photos } = await loadCatalog();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const month =
      typeof req.query.month === "string" ? req.query.month : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;

    const filtered = filterPhotos(photos, { month, year, q });
    const result = paginate(filtered, page, limit);

    res.json({
      photos: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    });
  } catch (err) {
    next(err);
  }
});

photosRouter.get("/:id", async (req, res, next) => {
  try {
    const { photos } = await loadCatalog();
    const month =
      typeof req.query.month === "string" ? req.query.month : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;

    const filtered = filterPhotos(photos, { month, year, q });
    const photo = filtered.find((p) => p.id === req.params.id);
    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }
    const index = filtered.findIndex((p) => p.id === photo.id);
    res.json({
      photo,
      prev: filtered[index + 1] ?? null,
      next: filtered[index - 1] ?? null,
    });
  } catch (err) {
    next(err);
  }
});
