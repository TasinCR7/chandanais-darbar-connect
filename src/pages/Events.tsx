import SectionTitle from "@/components/SectionTitle";
import EventCard from "@/components/EventCard";
import UrsTimeline from "@/components/UrsTimeline";
import SEO from "@/components/SEO";

const islamicEvents = [
  { title: "ঈদে মিলাদুন্নবী (সাঃ)", date: "১২ রবিউল আউয়াল (২৬ আগস্ট, ২০২৬)" },
  { title: "বিশেষ মাহফিল", date: "১১ রবিউস সানি (২৩ সেপ্টেম্বর, ২০২৬)" },
  { title: "বিশেষ অনুষ্ঠান", date: "৬ রজব (১৬ ডিসেম্বর, ২০২৬)" },
  { title: "বাবা জান কেবলা চন্দনাইশের মাসিক অনুষ্ঠান", date: "প্রতি আরবি মাসের ৩ তারিখ (পরবর্তী: ২৩ মার্চ, ২২ এপ্রিল, ২১ মে, ১৯ জুন...)" },
];

const Events = () => {
  return (
    <>
      <SEO 
        title="ওরশ ও মাহফিলের সময়সূচী" 
        description="চন্দনাইশ দরবার শরীফের বার্ষিক ওরশ, পবিত্র জন্মদিন ও অন্যান্য গুরুত্বপূর্ণ ইসলামি অনুষ্ঠানের সঠিক সময়সূচী এবং তারিখসমূহ জানুন।" 
        keywords="ওরশ সময়সূচী, মাহফিল তারিখ, চন্দনাইশ দরবার ক্যালেন্ডার, বার্ষিক ওরশ ২০২৬, ইসলামি অনুষ্ঠান"
        canonical="/events" 
      />
      <div className="py-20 islamic-pattern">
      <div className="container mx-auto px-4">
        <SectionTitle
          arabic="عُرْس شَرِيف"
          title="ওরশ ও ইসলামিক অনুষ্ঠান"
          subtitle="দরবার শরীফের বার্ষিক ওরশ ও গুরুত্বপূর্ণ ইসলামিক অনুষ্ঠানসমূহ"
        />

        <div className="max-w-4xl mx-auto space-y-20">
          {/* Urs Timeline */}
          <div>
            <h3 className="text-xl font-heading font-bold text-gold mb-10 text-center">
              বাংলা ক্যালেন্ডার অনুযায়ী ওরশের টাইমলাইন
            </h3>
            <UrsTimeline />
          </div>

          {/* Islamic Calendar Events */}
          <div>
            <h3 className="text-xl font-heading font-bold text-gold mb-6 text-center">
              হিজরি ক্যালেন্ডার অনুযায়ী
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {islamicEvents.map((event, i) => (
                <EventCard
                  key={i}
                  title={event.title}
                  date={event.date}
                  calendarType="islamic"
                  index={i}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Events;
