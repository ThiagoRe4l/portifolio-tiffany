/**
 * O jsdom tem o elemento <dialog>, mas não `showModal` nem `close`. Este substituto
 * imita o essencial: abrir (atributo `open`) e fechar, avisando com o evento `close`.
 * Foco preso e fundo inerte são do navegador e ficam com o E2E.
 */
export function installDialogMock(): void {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { __mocked?: true };
  if (proto.__mocked) return;

  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.show = proto.showModal;
  proto.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.dispatchEvent(new Event('close'));
  };
  proto.__mocked = true;
}
