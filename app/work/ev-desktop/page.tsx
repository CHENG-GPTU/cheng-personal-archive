import type { Metadata } from "next";
import PortfolioCase from "../case-layout";

export const metadata: Metadata = {
  title: "EV AI 桌面宠物｜CHENG 的作品",
  description: "EV 桌面智能伙伴：国风角色皮肤、语音交互与受限电脑操作的产品探索。",
};

export default function EvDesktopCasePage() {
  return <PortfolioCase slug="ev-desktop" />;
}
