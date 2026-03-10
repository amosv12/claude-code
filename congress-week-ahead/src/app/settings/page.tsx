export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-civic-navy mb-2">
          Settings & Notifications
        </h1>
        <p className="text-slate-600">
          Customize your Congress Week Ahead experience.
        </p>
      </div>

      {/* Notification preferences */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-bold text-civic-navy mb-4">
          Notification Preferences
        </h2>
        <div className="space-y-4">
          <ToggleSetting
            label="New hearing announcements"
            description="Get notified when new committee hearings are posted"
            defaultChecked
          />
          <ToggleSetting
            label="Schedule changes"
            description="Get notified when existing events are rescheduled or cancelled"
            defaultChecked
          />
          <ToggleSetting
            label="Major floor votes"
            description="Get notified about upcoming recorded votes on major legislation"
            defaultChecked
          />
          <ToggleSetting
            label="Markup sessions"
            description="Get notified when committees schedule bill markups"
          />
        </div>
      </div>

      {/* Tracked committees */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-bold text-civic-navy mb-4">
          Tracked Committees
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Select committees to prioritize in your feed and receive targeted
          notifications.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            "Judiciary",
            "Armed Services",
            "Appropriations",
            "Ways and Means",
            "Foreign Affairs",
            "Energy and Commerce",
            "Finance",
            "Intelligence",
            "Rules",
            "Budget",
          ].map((committee) => (
            <button
              key={committee}
              className="chip chip-inactive hover:chip-active"
            >
              {committee}
            </button>
          ))}
        </div>
      </div>

      {/* Export options */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-bold text-civic-navy mb-4">
          Calendar Export
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Export the congressional schedule to your calendar application.
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary">
            Export to .ics (iCal)
          </button>
          <button className="btn-secondary">
            Copy Google Calendar Link
          </button>
        </div>
      </div>

      {/* Data preferences */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-civic-navy mb-4">
          Display Preferences
        </h2>
        <div className="space-y-4">
          <ToggleSetting
            label="Show tentative events"
            description="Include events marked as tentative in the main calendar view"
            defaultChecked
          />
          <ToggleSetting
            label="Show source attribution"
            description="Display the data source for each event in the list view"
            defaultChecked
          />
          <ToggleSetting
            label="Compact view"
            description="Use a more compact layout for event cards"
          />
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  defaultChecked = false,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-civic-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-civic-blue after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
      </label>
    </div>
  );
}
