import VoiceLabClient from './VoiceLabClient';

export const metadata = {
  title: 'Voice Lab · GHC Academy',
  robots: { index: false, follow: false },
};

export default function VoiceLabPage() {
  return <VoiceLabClient />;
}
