'use client';

import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import './contact-card.css';

export const CONTACT_EMAIL = '1653600957@qq.com';

/** Local interaction adaptation of the supplied Framer Contact Button reference.
 * No Framer runtime, third-party identity, calendar or remote scripts are used.
 */
export default function ContactCard({ compact = false, word = false }: { compact?: boolean; word?: boolean }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pinned = useRef(false);
  const closeOnClick = useRef(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [opened, setOpened] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');

  function cancelLeave() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  }

  const position = useCallback(() => {
    if (!trigger.current || !panel.current) return;
    const button = trigger.current.getBoundingClientRect();
    panel.current.style.maxHeight = `${innerHeight - 32}px`;
    // Layout dimensions exclude the scale used by the entry animation.
    const card = { width: panel.current.offsetWidth, height: panel.current.offsetHeight };
    const gap = word ? 10 : 14, edge = 16;
    const preferredLeft = word ? button.right - card.width : button.left + button.width / 2 - card.width / 2;
    const left = Math.max(edge, Math.min(innerWidth - card.width - edge, preferredLeft));
    const belowSpace = Math.max(0, innerHeight - button.bottom - gap - edge);
    const aboveSpace = Math.max(0, button.top - gap - edge);
    const useBelow = word || belowSpace >= card.height || (aboveSpace < card.height && belowSpace >= aboveSpace);
    const available = useBelow ? belowSpace : aboveSpace;
    // Keep the trigger exposed even on short viewports; scroll the card if needed.
    panel.current.style.maxHeight = `${Math.max(1, available)}px`;
    const top = useBelow ? button.bottom + gap : button.top - Math.min(card.height, available) - gap;
    panel.current.style.left = `${left}px`;
    panel.current.style.top = `${top}px`;
  }, [word]);

  function show(pin = false) {
    cancelLeave();
    pinned.current ||= pin;
    panel.current?.showPopover();
    position();
  }

  function hide(restoreFocus = false) {
    cancelLeave();
    pinned.current = false;
    panel.current?.hidePopover();
    if (restoreFocus) trigger.current?.focus();
  }

  function scheduleLeave() {
    cancelLeave();
    leaveTimer.current = setTimeout(() => {
      if (!pinned.current && !panel.current?.contains(document.activeElement)) hide();
    }, 220);
  }

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);
  useEffect(() => {
    if (!opened) return;
    // Native popover escapes About's clipped layers without another Canvas or modal.
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [opened, position]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopyStatus('邮箱已复制');
    } catch {
      setCopyStatus('未能自动复制，请选择上方邮箱文字手动复制。');
    }
  }

  return <div className={`contact-control${compact ? ' contact-control--compact' : ''}${word ? ' contact-control--word' : ''}`}>
    <button ref={trigger} type="button" className="contact-trigger" aria-expanded={opened} aria-controls={id}
      onPointerEnter={event => { if (event.pointerType === 'mouse' && matchMedia('(hover: hover)').matches) show(); }}
      onPointerLeave={scheduleLeave}
      onPointerDown={() => { closeOnClick.current = pinned.current && !!panel.current?.matches(':popover-open'); }}
      onClick={event => {
        if (closeOnClick.current || (pinned.current && panel.current?.matches(':popover-open'))) hide();
        else { show(true); if (event.detail === 0) panel.current?.querySelector<HTMLButtonElement>('.contact-card__close')?.focus(); }
        closeOnClick.current = false;
      }}>
      <span className="contact-trigger__labels" aria-hidden="true"><span>{word ? 'opportunity' : '联系我'}</span><span>{word ? "Let's Talk" : '聊聊机会'}</span></span>
      <span className="contact-sr">{word ? 'opportunity — 联系我' : '联系我'}</span><span className="contact-trigger__arrow" aria-hidden="true">↗</span>
    </button>
    <div id={id} ref={panel} popover="auto" role="region" aria-label="陈俊呈的联系卡" className={`contact-card${word ? ' contact-card--reference' : ''}`}
      onToggle={event => {
        const isOpen = event.currentTarget.matches(':popover-open');
        setOpened(isOpen);
        if (!isOpen) { pinned.current = false; setCopyStatus(''); }
      }}
      onPointerEnter={cancelLeave} onPointerLeave={scheduleLeave}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null) && event.relatedTarget !== trigger.current) scheduleLeave();
      }}>
      <button className="contact-card__close" type="button" aria-label="关闭联系卡" onClick={() => hide(true)}>×</button>
      <div className="contact-card__identity">
        <div className="contact-card__portrait"><Image src="/images/cheng-resume-white-shirt.jpg" alt="陈俊呈" width={112} height={136} sizes="112px" /></div>
        <div className="contact-card__intro"><h3>陈俊呈</h3><p>求职方向 · AI 产品经理</p>{word ? <div className="contact-card__actions"><a href={`mailto:${CONTACT_EMAIL}`}>发送邮件 <span aria-hidden="true">↗</span></a></div> : <span>欢迎交流岗位与项目实践</span>}</div>
      </div>
      <div className="contact-card__email"><span>联系邮箱</span><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div>
      {word ? <button className="contact-card__copy" type="button" onClick={copyEmail}>复制邮箱</button> : <div className="contact-card__actions"><a href={`mailto:${CONTACT_EMAIL}`}>发送邮件 <span aria-hidden="true">↗</span></a><button type="button" onClick={copyEmail}>复制邮箱</button></div>}
      <p className={`contact-card__status${word ? ' contact-sr' : ''}`} role="status" aria-live="polite">{copyStatus || '发送邮件将打开你设备上的邮件应用。'}</p>
    </div>
  </div>;
}
