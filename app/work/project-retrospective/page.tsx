import type { Metadata } from "next";
import PortfolioCase from "../case-layout";
export const metadata: Metadata = { title: "项目复盘 Skill｜陈俊呈的作品", description: "从真实材料出发，分清个人贡献、AI 辅助与待验证结果的 Skill 原型。" };
export default function RetrospectiveCasePage() { return <PortfolioCase slug="project-retrospective" />; }
