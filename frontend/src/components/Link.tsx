import { forwardRef } from 'react';
import { ExternalLinkIcon } from './Icons';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  external?: boolean;
  showExternalIcon?: boolean;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, external = false, showExternalIcon = false, children, ...rest },
  ref
) {
  if (external) {
    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
        {showExternalIcon ? <ExternalLinkIcon /> : null}
      </a>
    );
  }
  return (
    <a ref={ref} href={href} {...rest}>
      {children}
    </a>
  );
});
