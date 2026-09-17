import type { Metadata } from "next";
import PortfolioCase from "../case-layout";
export const metadata: Metadata = { title: "个人作品与人生档案｜陈俊呈的作品", description: "兼顾当下求职与长期记录的个人网站框架与设计取舍。" };
export default function PersonalArchiveCasePage() { return <PortfolioCase slug="personal-archive" />; }
