import { Router, type IRouter } from "express";
import healthRouter from "./health";
import auth from "./auth";
import listings from "./listings";
import employees from "./employees";
import admin from "./admin";
import paidAds from "./paid-ads";
import stats from "./stats";
import cardImage from "./card-image";
import contactLogs from "./contact-logs";
import online from "./online";
import upload from "./upload";
import privacy from "./privacy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(privacy);
router.use("/api", privacy);
router.use("/auth", auth);
router.use("/listings", cardImage);
router.use("/listings", listings);
router.use("/employees", employees);
router.use("/admin", admin);
router.use("/paid-ads", paidAds);
router.use("/stats", stats);
router.use("/contact-logs", contactLogs);
router.use("/online", online);
router.use(upload);

export default router;
