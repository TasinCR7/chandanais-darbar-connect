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

const DEFAULT_KEYWORDS = [
  "দরবার শরীফ",
  "চন্দনাইশ দরবার শরীফ",
  "চন্দনাইশের মাজার",
  "চন্দনাইশ মাজার",
  "হযরত আবদুল লতিফ শাহ্",
  "চট্টগ্রামের দরবার",
  "বাংলাদেশের সেরা মাজার",
  "মাজার",
  "চট্টগ্রামের মাজার",
  "চট্টগ্রামের আধ্যাত্মিক স্থান",
  "আধ্যাত্মিক স্থান",
  "বাংলাদেশের আধ্যাত্মিক স্থান",
  "চট্টগ্রামের দর্শনীয় আধ্যাত্মিক স্থান",
  "চট্টগ্রামের সেরা আধ্যাত্মিক কেন্দ্র",
  "বাংলাদেশের পবিত্র আধ্যাত্মিক স্থান",
  "সুফি আধ্যাত্মিক কেন্দ্র",
  "ইসলামী আধ্যাত্মিক স্থান",
  "চট্টগ্রামের জিয়ারতের স্থান",
  "জিয়ারতের স্থান",
  "বাংলাদেশের বিখ্যাত দরবার ও মাজার",
  "চট্টগ্রাম দরবার শরীফ",
  "গাউছে জামান চন্দনাইশী",
  "আবদুল লতিফ শাহ চন্দনাইশী",
  "মাইজভান্ডারী দরবার শরীফ",
  "সিলসিলা ই তরিকায়ে মাইজভান্ডারিয়া",
  "চন্দনাইশ দরবার শরীফের ইতিহাস",
  "চন্দনাইশ দরবার শরীফের ওরশ",
  "পীর বাবা চন্দনাইশী",
  "Chandanaish Darbar Sharif",
  "Chandanaish Mazar Sharif",
  "Spiritual place in Chittagong",
  "Spiritual places in Bangladesh",
  "Best spiritual center in Chittagong",
  "Islamic spiritual center Bangladesh",
  "Famous Mazar in Chittagong Bangladesh",
  "Hazrat Syed Abdul Latif Shah Chandanaishi",
  "Best Darbar Sharif in Chittagong",
  "Maizbhandari Torika"
].join(", ");

const SEO = ({ title, description, canonical, keywords, type = "website", faq, events }: SEOProps) => {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const DEFAULT_DESCRIPTION = "চন্দনাইশ দরবার শরীফ - ধর্মীয় ইভেন্ট, পাঠ, দান এবং দরবার সম্পর্কিত তথ্যের সর্বোত্তম উৎস।";

  const defaultSEOProps = (pageTitle: string, pageDesc?: string) => ({
    title: pageTitle,
    description: pageDesc || DEFAULT_DESCRIPTION,
    canonical: undefined,
    keywords: undefined,
    type: "website",
  });

  const url = canonical ? `${BASE_URL}${canonical}` : BASE_URL;
  const siteKeywords = keywords ? `${keywords}, ${DEFAULT_KEYWORDS}` : DEFAULT_KEYWORDS;
  const ogImage = `${BASE_URL}/logo.png`; 

  // Base Schema Markups
  const structuredData: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "PlaceOfWorship",
      "name": SITE_NAME,
      "alternateName": [
        "Chandanaish Darbar Sharif", 
        "চন্দনাইশের মাজার", 
        "চন্দনাইশ মাজার", 
        "হযরত আবদুল লতিফ শাহ্ মাজার শরীফ", 
        "চট্টগ্রামের দরবার", 
        "বাংলাদেশের সেরা মাজার", 
        "মাইজভান্ডারী দরবার শরীফ চন্দনাইশ"
      ],
      "description": description,
      "url": url,
      "logo": `${BASE_URL}/logo.png`,
      "image": `${BASE_URL}/logo.png`,
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 22.2052,
        "longitude": 91.9542
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "00:00",
        "closes": "23:59"
      },
      "priceRange": "Free / হাদিয়া",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Chandanaish Darbar Sharif",
        "addressLocality": "Chandanaish",
        "addressRegion": "Chattogram",
        "addressCountry": "BD"
      },
      "telephone": "+8801622721996",
      "sameAs": [
        "https://www.facebook.com/Torikaye.Chandanaishi.Al.Maijvandri",
        "https://www.youtube.com/@ChandanaishDarbar"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "ReligiousOrganization",
      "name": SITE_NAME,
      "alternateName": ["Chandanaish Darbar Sharif", "চন্দনাইশের মাজার"],
      "description": description,
      "url": url,
      "logo": `${BASE_URL}/logo.png`,
      "image": `${BASE_URL}/logo.png`
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": SITE_NAME,
      "url": BASE_URL,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${BASE_URL}/qna?search={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
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
      <meta property="og:locale" content="bn_BD" />
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
