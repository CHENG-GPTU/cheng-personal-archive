import type { Metadata } from "next";
import PortfolioCase from "../case-layout";
export const metadata: Metadata = { title: "AIPM 学习系统｜陈俊呈的作品", description: "从任务提醒转向引导式学习的 AI 产品实践，记录本人判断、AI 协作与验证计划。" };
export default function AipmCoachCase() { return <PortfolioCase slug="aipm-coach" />; }
