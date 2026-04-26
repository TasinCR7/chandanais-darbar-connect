import { Helmet } from "react-helmet-async";

interface FAQItem {
  question: string;
  answer: string;
}

interface EventItem {
  name: string;
  startDate: string;
  location: string;
  description: string;
  image?: string;
}

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string;
  type?: "website" | "article" | "profile";
  faq?: FAQItem[];
  events?: EventItem[];
}

const SITE_NAME = "চন্দনাইশ দরবার শরীফ";
const BASE_URL = "https://chandanaish-darbar.com";

const SEO = ({ title, description, canonical, keywords, type = "website", faq, events }: SEOProps) => {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const url = canonical ? `${BASE_URL}${canonical}` : BASE_URL;
  const siteKeywords = keywords || "চন্দনাইশ দরবার শরীফ, দরবার শরীফ, মাইজভান্ডারী, গাউছে জামান আবদুল লতিফ শাহ, সুফিবাদ, ইসলাম, চন্দনাইশ, চট্টগ্রাম, ওরশ, হাদিয়া, দোয়া আবেদন, আধ্যাত্মিক সাধনা, অলি আল্লাহ, কুতুবুল আলম, ত্বরিকত, সুফি সংগীত, সামা মাহফিল, মাজহাব, আহলে সুন্নাত ওয়াল জামাত, Chandanaish Darbar Sharif, Maizbhandari, Sufism, Islam, Chattogram, Best Darbar Sharif in Chittagong, Spiritual Center Bangladesh, Hazrat Abdul Latif Shah, Maizbhandari Torika, Sufi Shrine Bangladesh, Islamic Spirituality, Chandanaish News, Chattogram Religious Center";
  const ogImage = `${BASE_URL}/logo.png`; 

  // Base Schema Markups
  const structuredData: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "ReligiousOrganization",
      "name": SITE_NAME,
      "alternateName": ["Chandanaish Darbar Sharif", "চন্দনাইশ দরবার শরীফ", "Maizbhandari Darbar Sharif Chandanaish"],
      "description": description,
      "url": url,
      "logo": `${BASE_URL}/logo.png`,
      "image": `${BASE_URL}/logo.png`,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Chandanaish Darbar Sharif",
        "addressLocality": "Chandanaish",
        "addressRegion": "Chattogram",
        "addressCountry": "BD"
      },
      "telephone": "+8801819385557",
      "sameAs": [
        "https://www.facebook.com/ChandanaishDarbar",
        "https://www.youtube.com/@ChandanaishDarbar"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": BASE_URL
        },
        ...(canonical && canonical !== "/" ? [
          {
            "@type": "ListItem",
            "position": 2,
            "name": title,
            "item": `${BASE_URL}${canonical}`
          }
        ] : [])
      ]
    }
  ];

  // Add FAQ Schema if provided
  if (faq && faq.length > 0) {
    structuredData.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faq.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }))
    });
  }

  // Add Event Schema if provided
  if (events && events.length > 0) {
    events.forEach(event => {
      structuredData.push({
        "@context": "https://schema.org",
        "@type": "Event",
        "name": event.name,
        "startDate": event.startDate,
        "location": {
          "@type": "Place",
          "name": event.location,
          "address": "Chandanaish, Chattogram"
        },
        "image": event.image || ogImage,
        "description": event.description
      });
    });
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={siteKeywords} />
      <link rel="canonical" href={url} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export default SEO;
