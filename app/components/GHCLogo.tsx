import type { ComponentProps } from 'react';
import GHCLogoBase from './GHCLogoBase';
import founderPhotoData from '../preventa/founder-photo/data';

type Props = ComponentProps<typeof GHCLogoBase>;

export default function GHCLogo(props: Props) {
  return (
    <>
      <style>{`
        [data-preventa-root] .conversion-founder-portrait {
          background-image: url('${founderPhotoData}') !important;
          background-size: cover !important;
          background-position: 50% 50% !important;
          background-repeat: no-repeat !important;
        }
        [data-preventa-root] .conversion-founder-portrait > img {
          display: none !important;
        }
        @media (max-width: 860px) {
          [data-preventa-root] .conversion-founder-portrait {
            background-position: 50% 42% !important;
          }
        }
      `}</style>
      <GHCLogoBase {...props} />
    </>
  );
}
