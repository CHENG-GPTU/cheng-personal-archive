"use client";

import dynamic from 'next/dynamic';
import { Component, type ReactNode } from 'react';

const loadLanyard = () => import('@/components/react-bits/Lanyard/Lanyard');
export function prepareInteractiveBadge() {
  // Download the module and actual model/textures while the archive is on screen.
  void loadLanyard().then(module => module.preloadBadgeAssets()).catch(() => {});
}
const Lanyard = dynamic(loadLanyard, {
  ssr: false,
  loading: () => null,
});

class BadgeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div className="badge-status" role="alert"><img src="/assets/lanyard/card-front.png" alt="陈俊呈的个人工牌" /><p>当前设备未能加载互动工牌，已显示静态版本。</p></div>
      : this.props.children;
  }
}

const DOSSIER_CAMERA: [number, number, number] = [0, -1.32, 9.2];
const DOSSIER_TARGET: [number, number, number] = [0, -0.52, 0];

export default function InteractiveBadge({ dossier = false, onPullRelease }: { dossier?: boolean; onPullRelease?: (distance: number) => void }) {
  const assets = '/assets/lanyard/cheng-v2';
  return <BadgeBoundary><Lanyard position={dossier ? DOSSIER_CAMERA : undefined} cameraTarget={dossier ? DOSSIER_TARGET : undefined} frontImage={`${assets}/card-front.png`} backImage={`${assets}/card-back.png`} lanyardImage={`${assets}/strap.png`} imageFit="contain" lanyardWidth={3.2} chengHardware onPullRelease={onPullRelease} /></BadgeBoundary>;
}
