import { Icon } from '../components/Icon';
import { asset, useDocumentTitle } from '../components/ui';
import { church } from '../config';
import { useSettings } from '../lib/store';
import { mapsLink, whatsappLink } from '../lib/format';

const TIMELINE = [
  { date: 'December 1999', text: 'Our founder fully surrenders his life to Christ.' },
  { date: '16 October 2013', text: 'Released by the Redeemed Christian Church of God, after three years as an assistant pastor and service as a pioneering parish pastor.' },
  { date: '27 November 2013', text: 'Prayed for and sent forth to begin the ministry.' },
  { date: '1 December 2013', text: 'CRCC begins in the founder’s living room with his immediate family.' },
  { date: '5 January 2014', text: 'First service at The Renewal Center, Olodo, Ibadan, with 40 members.' },
  { date: 'Today', text: 'Worshipping at Atofarati Quarters, beside Coca-Cola, Olode, Ibadan.' },
];

function ServiceTimes() {
  const s = useSettings();
  return (
    <div className="times">
      {s.serviceTimes.map((t) => (
        <div key={t.label} className="time-row">
          <span className="ic-box"><Icon name="clock" size={20} /></span>
          <div>
            <div style={{ fontWeight: 700 }}>{t.label}</div>
            <div className="small muted">{t.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function About() {
  useDocumentTitle('About');
  const s = useSettings();
  return (
    <>
      <section className="about-hero">
        <div className="container">
          <img src={asset('/images/logo.png')} alt="CRCC — Transforming Lives" />
          <h1>{church.name}</h1>
          <p className="muted" style={{ marginTop: 8 }}>Renewing and transforming lives and nations · {church.scripture}</p>
        </div>
      </section>

      <div className="container page">
        <div className="stack" style={{ gap: 56 }}>
          <div className="two-col">
            <section className="section">
              <h2 className="page-title" style={{ fontSize: 28 }}>Our story</h2>
              <div className="prose">
                <p>
                  CRCC began on 1 December 2013 in our founder’s living room, with his immediate family. A month later, on 5 January 2014, 40
                  members gathered for the first service at The Renewal Center in Olodo, Ibadan. Our founder was 40 at the time, the same age at
                  which Moses was called to lead Israel.
                </p>
                <p>
                  The name came through his wife, who was told it would begin with “Christ” and end with “Church”. The middle, “The Renewal”,
                  comes from Romans 12:2: a mandate to renew and transform lives and nations.
                </p>
              </div>
              <div className="stack gap-12" style={{ marginTop: 8 }}>
                <div className="soft card-pad">
                  <div className="eyebrow" style={{ color: 'var(--blue)' }}>Vision</div>
                  <p style={{ marginTop: 4 }}>{s.vision}</p>
                </div>
                <div className="soft card-pad">
                  <div className="eyebrow" style={{ color: 'var(--blue)' }}>Mission</div>
                  <p style={{ marginTop: 4 }}>{s.mission}</p>
                </div>
              </div>
            </section>
            <section className="section" aria-label="Timeline">
              <h2 style={{ fontSize: 19 }}>Milestones</h2>
              <div className="timeline">
                {TIMELINE.map((t) => (
                  <div key={t.date} className="tl-item">
                    <div className="tl-rail"><span className="tl-dot" /><span className="tl-line" /></div>
                    <div className="tl-body">
                      <div className="tl-date">{t.date}</div>
                      <div>{t.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="section">
            <h2 className="page-title" style={{ fontSize: 28 }}>Our founder</h2>
            <article className="person">
              <img src={asset('/images/founder.jpg')} alt="Pastor Moses Ayodele Egbeniyi" />
              <div className="p-body">
                <h3 style={{ fontSize: 22 }}>Pastor Moses Ayodele Egbeniyi</h3>
                <div className="small" style={{ fontWeight: 700, color: 'var(--orange-text)' }}>Founder</div>
                <div className="prose">
                  <p>
                    Born to the late Pa James Ayodeji Egbeniyi and Deaconess Alice Egbeniyi of Oke-Ose compound, Edunabon, Osun State, he first
                    encountered Jesus in 1994 in Ile-Ife while preparing for JAMB, and surrendered fully in December 1999.
                  </p>
                  <p>
                    He served in the Redeemed Christian Church of God as an assistant pastor and then as a pioneering parish pastor before answering
                    the call to start CRCC. A preacher and a businessman, he has studied at several Bible colleges and is passionate about raising
                    leaders.
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section className="section">
            <h2 className="page-title" style={{ fontSize: 28 }}>Our First Lady</h2>
            <article className="person">
              <img src={asset('/images/firstlady.jpg')} alt={s.firstLadyName} style={{ objectPosition: '30% 20%' }} />
              <div className="p-body">
                <h3 style={{ fontSize: 22 }}>{s.firstLadyName}</h3>
                <div className="prose"><p>{s.firstLadyBio}</p></div>
              </div>
            </article>
          </section>

          <section className="two-col" id="visit">
            <div className="section">
              <h2 className="page-title" style={{ fontSize: 28 }}>Visit us</h2>
              <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
                <Icon name="pin" size={22} className="muted" />
                <div>
                  <div style={{ fontWeight: 700 }}>{church.address}</div>
                  <a href={mapsLink(church.mapsQuery)} target="_blank" rel="noreferrer">Open in Google Maps</a>
                </div>
              </div>
              <ServiceTimes />
            </div>
            <div className="section" id="contact">
              <iframe
                title="Map to CRCC"
                src={`https://www.google.com/maps?q=${encodeURIComponent(church.mapsQuery)}&output=embed`}
                style={{ width: '100%', height: 300, border: 0, borderRadius: 'var(--r-lg)' }}
                loading="lazy"
              />
              <div className="row gap-8 wrap">
                {s.phone && <a className="btn btn-ghost btn-sm" href={`tel:${s.phone}`}><Icon name="phone" size={18} /> Call</a>}
                {s.whatsapp && <a className="btn btn-ghost btn-sm" href={whatsappLink(s.whatsapp)} target="_blank" rel="noreferrer">WhatsApp</a>}
                {s.email && <a className="btn btn-ghost btn-sm" href={`mailto:${s.email}`}><Icon name="mail" size={18} /> Email</a>}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
