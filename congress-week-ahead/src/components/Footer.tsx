import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-civic-navy text-slate-400 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-2">Congress Week Ahead</h3>
            <p className="text-sm">
              A civic technology tool that organizes the upcoming week&apos;s
              official U.S. Congress calendar for both the House and Senate.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Official Sources</h3>
            <ul className="text-sm space-y-1">
              <li>
                <a
                  href="https://www.majoritywhip.gov/floor-schedule/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  House Majority Leader Schedule
                </a>
              </li>
              <li>
                <a
                  href="https://www.senate.gov/legislative/schedule.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Senate Floor Schedule
                </a>
              </li>
              <li>
                <a
                  href="https://www.congress.gov/committee-schedule"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Committee Schedule (Congress.gov)
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">About</h3>
            <ul className="text-sm space-y-1">
              <li>
                <Link href="/sources" className="hover:text-white transition-colors">
                  Source Transparency Log
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-white transition-colors">
                  Settings & Notifications
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-700 mt-8 pt-6 text-sm text-center">
          <p>
            All schedule data sourced from official U.S. Congress publications.
            Not affiliated with or endorsed by the U.S. Government.
          </p>
          <p className="mt-1 text-slate-500">
            All times shown in Eastern Time (ET). Data may be delayed or incomplete.
          </p>
        </div>
      </div>
    </footer>
  );
}
