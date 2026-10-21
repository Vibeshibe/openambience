// One shared, nonmodal notice for routine feedback. Successes expire; problems
// remain visible until dismissed or replaced. Keep focus in the current task.
export function createFeedback(notice, { mirror, fallbackFocus } = {}) {
  const message = notice.querySelector('[role="status"]');
  const dismiss = notice.querySelector('button');
  const icon = notice.querySelector('[aria-hidden="true"]');
  let timer, previousFocus;
  const visible = () => !notice.classList.contains('sr-only');
  const interacting = () => notice.matches(':hover, :focus-within');
  function cancelDismiss() {
    clearTimeout(timer);
    notice.classList.remove('notice-leaving');
  }
  function hide() {
    cancelDismiss();
    notice.classList.add('sr-only');
    dismiss.hidden = true;
  }
  function scheduleDismiss() {
    cancelDismiss();
    if (!visible() || notice.dataset.tone !== 'success' || interacting()) return;
    timer = setTimeout(() => {
      notice.classList.add('notice-leaving');
      timer = setTimeout(hide, 180);
    }, 5000);
  }
  function show(text, { quiet = false, success = false } = {}) {
    cancelDismiss();
    const focused = notice.ownerDocument.activeElement;
    if (!notice.contains(focused)) previousFocus = focused;
    message.textContent = text;
    if (mirror) mirror.textContent = text;
    notice.dataset.tone = success ? 'success' : 'notice';
    icon.hidden = !success;
    notice.classList.toggle('sr-only', quiet);
    dismiss.hidden = quiet;
    scheduleDismiss();
  }
  dismiss.onclick = () => {
    hide();
    const canRestore = previousFocus?.isConnected && previousFocus !== notice.ownerDocument.body && !previousFocus.disabled
      && !previousFocus.closest('[hidden], dialog:not([open])');
    (canRestore ? previousFocus : fallbackFocus)?.focus({ preventScroll: true });
  };
  notice.addEventListener('pointerenter', cancelDismiss);
  notice.addEventListener('pointerleave', scheduleDismiss);
  notice.addEventListener('focusin', cancelDismiss);
  notice.addEventListener('focusout', event => {
    if (!notice.contains(event.relatedTarget)) queueMicrotask(scheduleDismiss);
  });
  return {
    status: (text, { quiet = false } = {}) => show(text, { quiet }),
    success: text => show(text, { success: true }),
    hide,
  };
}
