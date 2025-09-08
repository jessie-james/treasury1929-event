import { type Event } from "@shared/schema";
import { useLocation } from "wouter";

export function EventCard({ event }: { event: Event }) {
  const [_, setLocation] = useLocation();

  const handleClick = () => {
    setLocation(`/events/${event.id}`);
  };

  return (
    <div 
      onClick={handleClick}
      className="relative cursor-pointer rounded-lg overflow-hidden"
      style={{ 
        width: '100%',
        height: '400px',
        maxWidth: '300px',
        margin: '0 auto'
      }}
    >
      {/* Event Image */}
      <img
        src={event.image || '/assets/placeholder-event.jpg'}
        alt={event.title || 'Event'}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = '/assets/placeholder-event.jpg';
        }}
      />
      
      {/* Title Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-3">
        <h3 className="text-sm font-medium leading-tight">
          {event.title}
        </h3>
      </div>
    </div>
  );
}