// Tell React's DOM attribute types about our magic props.
import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    // camelCase magic props
    definesHorizon?: boolean | string;
    definesHorizonWithName?: string;
    horizonLog?: boolean;
    horizonName?: string;

    // optional data-* aliases (keeps DOM valid if you prefer)
    'data-defines-horizon'?: boolean | string;
    'data-defines-horizon-with-name'?: string;
    'data-horizon-log'?: boolean;
    'data-horizon-name'?: string;
  }
}
