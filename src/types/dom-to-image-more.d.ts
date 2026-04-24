/**
 * Declaração de tipos manual para dom-to-image-more.
 * Necessário pois o pacote não possui @types no DefinitelyTyped.
 */
declare module "dom-to-image-more" {
  interface Options {
    width?: number;
    height?: number;
    style?: Partial<CSSStyleDeclaration>;
    quality?: number;
    bgcolor?: string;
    imagePlaceholder?: string;
    cacheBust?: boolean;
    useCredentials?: boolean;
    filter?: (node: Node) => boolean;
  }

  const domtoimage: {
    /** Converte elemento para Data URL PNG */
    toPng(node: Node, options?: Options): Promise<string>;
    /** Converte elemento para Data URL JPEG */
    toJpeg(node: Node, options?: Options): Promise<string>;
    /** Converte elemento para Data URL SVG */
    toSvg(node: Node, options?: Options): Promise<string>;
    /** Converte elemento para Blob PNG */
    toBlob(node: Node, options?: Options): Promise<Blob>;
    /** Converte elemento para pixel data */
    toPixelData(node: Node, options?: Options): Promise<Uint8ClampedArray>;
  };

  export default domtoimage;
}