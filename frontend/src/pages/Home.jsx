import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { streakDays } from '../utils/streak.js';
import { QUICK_INSPIRE } from '../data/inspire.js';
import QuickReviewBox from '../components/QuickReviewBox.jsx';
import { sectionPath } from '../lib/sectionLinks.js';

const IDIOMS = [
  { text: 'Practice makes perfect.', author: 'Proverb' },
  { text: 'Knowledge is power.', author: 'Francis Bacon' },
  { text: 'Slow and steady wins the race.', author: 'Aesop' },
  { text: "Where there's a will, there's a way.", author: 'Proverb' },
  { text: 'The early bird catches the worm.', author: 'Proverb' },
  { text: "Rome wasn't built in a day.", author: 'Proverb' },
  { text: 'A journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: 'Little strokes fell great oaks.', author: 'Benjamin Franklin' },
  { text: 'Success is a journey, not a destination.', author: 'Proverb' },
  { text: "It always seems impossible until it's done.", author: 'Nelson Mandela' },
  { text: 'Mistakes are proof that you are trying.', author: 'Proverb' },
  { text: 'The best time to plant a tree was 20 years ago.', author: 'Chinese Proverb' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: 'The more you learn, the more you earn.', author: 'Proverb' },
  { text: 'Learning never exhausts the mind.', author: 'Leonardo da Vinci' },
  { text: 'Today a reader, tomorrow a leader.', author: 'Proverb' },
  { text: 'Action speaks louder than words.', author: 'Proverb' },
  { text: 'Well begun is half done.', author: 'Aristotle' },
  { text: 'No pain, no gain.', author: 'Proverb' },
  { text: 'Every cloud has a silver lining.', author: 'Proverb' },
  { text: 'Fall seven times, stand up eight.', author: 'Japanese Proverb' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
  { text: 'Your only limit is your mind.', author: 'Proverb' },
  { text: 'Don\'t watch the clock; keep going.', author: 'Sam Levenson' },
  { text: 'Education is the most powerful weapon to change the world.', author: 'Nelson Mandela' },
  { text: 'Small steps every day lead to big results.', author: 'Proverb' },
  { text: 'Study hard, dream big.', author: 'Proverb' },
  { text: 'Reading is to the mind what exercise is to the body.', author: 'Joseph Addison' },
  { text: 'Start where you are; use what you have; do what you can.', author: 'Arthur Ashe' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Better late than never.', author: 'Proverb' },
  { text: 'A little progress each day adds up to big results.', author: 'Proverb' },
  { text: 'Dream big, work hard, stay focused.', author: 'Proverb' },
  { text: 'The roots of education are bitter, but the fruit is sweet.', author: 'Aristotle' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: "Believe you can and you're halfway there.", author: 'Theodore Roosevelt' },
  { text: 'Success is the sum of small efforts repeated daily.', author: 'Robert Collier' },
  { text: 'The future belongs to those who prepare for it today.', author: 'Malcolm X' },
  { text: 'Teach a man to fish and you feed him for a lifetime.', author: 'Proverb' },
  { text: 'Knowledge shared is knowledge doubled.', author: 'Proverb' },
  { text: 'Everything you want is on the other side of fear.', author: 'George Addair' },
  { text: 'You learn something new every day.', author: 'Proverb' },
  { text: 'The pen is mightier than the sword.', author: 'Edward Bulwer-Lytton' },
  { text: 'Wisdom begins in wonder.', author: 'Socrates' },
  { text: 'Every expert was once a beginner.', author: 'Proverb' },
  { text: 'Knowledge without practice is useless.', author: 'Proverb' },
  { text: 'Genius is one percent inspiration and ninety-nine percent perspiration.', author: 'Thomas Edison' },
  { text: 'The more that you read, the more things you will know.', author: 'Dr. Seuss' },
  { text: 'Learning is a treasure that will follow its owner everywhere.', author: 'Chinese Proverb' },
  { text: 'It is never too late to learn.', author: 'Proverb' },
  { text: 'What you sow today, you harvest tomorrow.', author: 'Proverb' },
  { text: 'A calm mind wins every battle.', author: 'Proverb' },
  { text: 'Success comes to those who work for it.', author: 'Proverb' },
  { text: 'Rise and grind — the early hours are golden.', author: 'Proverb' },
  { text: 'Study while others sleep; work while others loaf.', author: 'Proverb' },
  { text: 'Every question answered makes you stronger.', author: 'Proverb' },
  { text: 'The library is the university of the poor.', author: 'Proverb' },
  { text: 'A year from now, you will wish you had started today.', author: 'Karen Lamb' },
  { text: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
  { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  { text: 'Happiness is not a goal; it is a by-product of a life well lived.', author: 'Eleanor Roosevelt' },
  { text: 'What we learn with pleasure we never forget.', author: 'Alfred Mercier' },
  { text: 'A good book is a good friend.', author: 'Proverb' },
  { text: 'Knowledge is the eye of the mind.', author: 'Proverb' },
  { text: 'He who opens a school door, closes a prison.', author: 'Victor Hugo' },
  { text: 'One hour of study is worth ten of guessing.', author: 'Proverb' },
  { text: 'Do it now — sometimes later becomes never.', author: 'Proverb' },
  { text: 'The highest education is that which gives knowledge of life.', author: 'Proverb' },
  { text: 'Try not to become a man of success, but rather try to become a man of value.', author: 'Albert Einstein' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'A smooth sea never made a skilled sailor.', author: 'Proverb' },
  { text: 'Be the change you wish to see in the world.', author: 'Mahatma Gandhi' },
  { text: 'The only true wisdom is in knowing you know nothing.', author: 'Socrates' },
  { text: 'Fortune favors the bold.', author: 'Proverb' },
  { text: 'Haste makes waste.', author: 'Proverb' },
  { text: 'Look before you leap.', author: 'Proverb' },
  { text: 'A stitch in time saves nine.', author: 'Proverb' },
  { text: 'Two heads are better than one.', author: 'Proverb' },
  { text: 'The sky is the limit.', author: 'Proverb' },
  { text: 'Practice makes perfect.', author: 'Proverb' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'The only limit to our realization of tomorrow is our doubts of today.', author: 'Franklin D. Roosevelt' },
  { text: 'Dream big and dare to fail.', author: 'Warren Buffet' },
  { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'Every expert was once a beginner.', author: 'Proverb' },
  { text: 'Don\'t watch the clock; do what it does. Keep going.', author: 'Sam Levenson' },
  { text: 'The beautiful thing in life is not depending on money.', author: 'Albert Einstein' },
  { text: 'Life is not about finding yourself. Life is about creating yourself.', author: 'George Bernard Shaw' },
  { text: 'What we think, we become.', author: 'Buddhist Proverb' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'If you want to achieve greatness, stop asking for permission.', author: 'Anonymous' },
  { text: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson' },
  { text: 'The most common way people give up their power is by thinking they don\'t have any.', author: 'Alice Walker' },
  { text: 'Don\'t be pushed around by the fears in your mind. Be led by the dreams in your heart.', author: 'Maya Angelou' },
  { text: 'The purpose of our lives is to be happy.', author: 'Dalai Lama' },
  { text: 'Life is really simple, but we insist on making it complicated.', author: 'Confucius' },
  { text: 'Good health is the greatest wealth.', author: 'Buddha' },
  { text: 'The only way to do well in life is to trade off leisure for better performance.', author: 'Anonymous' },
  { text: 'Knowledge is power.', author: 'Sir Francis Bacon' },
  { text: 'The beautiful thing about learning is that nobody can take it away from you.', author: 'B.B. King' },
  { text: 'Education is the most powerful weapon you can use to change the world.', author: 'Nelson Mandela' },
  { text: 'The harder you work, the luckier you get.', author: 'Anonymous' },
  { text: 'Your time is limited, don\'t waste it living someone else\'s life.', author: 'Steve Jobs' },
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  { text: 'You miss 100% of the shots you don\'t take.', author: 'Wayne Gretzky' },
  { text: 'You only live once, but if you do it right, once is enough.', author: 'Mae West' },
  { text: 'In three words I can sum up everything I\'ve learned about life: it goes on.', author: 'Robert Frost' },
  { text: 'Life is what happens when you\'re busy making other plans.', author: 'John Lennon' },
  { text: 'You can\'t use up creativity. The more you use, the more you have.', author: 'Yoda' },
  { text: 'The best revenge is massive success.', author: 'Frank Sinatra' },
  { text: 'Don\'t wait for the perfect moment, take the moment and make it perfect.', author: 'Anonymous' },
  { text: 'Your only limit is your mind.', author: 'Anonymous' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'The road to success is always under construction.', author: 'Anonymous' },
  { text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
  { text: 'If you want to make a permanent mark, first make a temporary one.', author: 'Anonymous' },
  { text: 'Don\'t be afraid to give up the good to go for the great.', author: 'John D. Rockefeller' },
  { text: 'Success is walking from failure to failure without losing enthusiasm.', author: 'Winston Churchill' },
  { text: 'The only place where success comes before work is in the dictionary.', author: 'Vidal Sassoon' },
  { text: 'What\'s right is what feels good. What\'s good is what\'s right.', author: 'Yogi Berra' },
  { text: 'Don\'t let yesterday take up too much of today.', author: 'Will Rogers' },
  { text: 'You can\'t live a perfect day without doing something for someone else.', author: 'Anonymous' },
  { text: 'Life is not about waiting for the storm to pass, it\'s about learning to dance in the rain.', author: 'Unknown' },
  { text: 'The only constant in life is change.', author: 'Heraclitus' },
  { text: 'Be the change that you wish to see in the world.', author: 'Mahatma Gandhi' },
  { text: 'The mind is everything. What you think you become.', author: 'Buddha' },
  { text: 'Whether you think you can or think you can\'t, you\'re right.', author: 'Henry Ford' },
  { text: 'The best preparation for tomorrow is to do today what you can do well.', author: 'Unknown' },
  { text: 'Don\'t wait. The time will never be right.', author: 'Anonymous' },
  { text: 'The only person you should try to be is the person you are.', author: 'Unknown' },
  { text: 'Life is short. Make every day count.', author: 'Unknown' },
  { text: 'The future depends on what you do today.', author: 'Unknown' },
  { text: 'Don\'t let your fears stand in the way of your dreams.', author: 'Unknown' },
  { text: 'The only way to achieve the impossible is to believe it is possible.', author: 'Unknown' },
  { text: 'Success is not about perfection, it\'s about progress.', author: 'Unknown' },
  { text: 'Every ending is a new beginning.', author: 'Unknown' },
  { text: 'The best way to predict the future is to create it.', author: 'Unknown' },
  { text: 'Your only limit is your mind.', author: 'Unknown' },
  { text: 'The only thing stopping you from achieving your goals is what you do today.', author: 'Unknown' },
  { text: 'Don\'t let yesterday take up too much of today.', author: 'Unknown' },
  { text: 'You are never too old to set another goal or to dream a new dream.', author: 'C.S. Lewis' },
  { text: 'The only way to learn a language is to speak it.', author: 'Anonymous' },
  { text: 'You can\'t teach an old dog new tricks.', author: 'Anonymous' },
  { text: 'A stitch in time saves nine.', author: 'Anonymous' },
  { text: 'A penny saved is a penny earned.', author: 'Anonymous' },
  { text: 'Actions speak louder than words.', author: 'Anonymous' },
  { text: 'Honesty is the best policy.', author: 'Anonymous' },
  { text: 'The early bird catches the worm.', author: 'Anonymous' },
  { text: 'Good things come to those who wait.', author: 'Anonymous' },
  { text: 'God helps those who help themselves.', author: 'Anonymous' },
  { text: 'The grass is always greener on the other side.', author: 'Anonymous' },
  { text: 'A rolling stone gathers no moss.', author: 'Anonymous' },
  { text: 'You can\'t have your cake and eat it too.', author: 'Anonymous' },
  { text: 'Better safe than sorry.', author: 'Anonymous' },
  { text: 'Home sweet home.', author: 'Anonymous' },
  { text: 'The family that prays together stays together.', author: 'Anonymous' },
  { text: 'Blood is thicker than water.', author: 'Anonymous' },
  { text: 'Actions speak louder than words.', author: 'Anonymous' },
  { text: 'The squeaky wheel gets the grease.', author: 'Anonymous' },
  { text: 'If you want something done well, do it yourself.', author: 'Anonymous' },
  { text: 'You can\'t have your cake and eat it too.', author: 'Anonymous' },
  { text: 'Honesty is the best policy.', author: 'Anonymous' },
  { text: 'The early bird catches the worm.', author: 'Anonymous' },
  { text: 'Good things come to those who wait.', author: 'Anonymous' },
  { text: 'God helps those who help themselves.', author: 'Anonymous' },
  { text: 'The grass is always greener on the other side.', author: 'Anonymous' },
  { text: 'A rolling stone gathers no moss.', author: 'Anonymous' },
  { text: 'You can\'t have your cake and eat it too.', author: 'Anonymous' },
  { text: 'Better safe than sorry.', author: 'Anonymous' },
  { text: 'Home sweet home.', author: 'Anonymous' },
  { text: 'The family that prays together stays together.', author: 'Anonymous' },
  { text: 'Blood is thicker than water.', author: 'Anonymous' },
  { text: 'Actions speak louder than words.', author: 'Anonymous' },
  { text: 'The squeaky wheel gets the grease.', author: 'Anonymous' },
  { text: 'If you want something done well, do it yourself.', author: 'Anonymous' },
  { text: 'Where there is a will, there is a way.', author: 'Proverb' },
  { text: 'Necessity is the mother of invention.', author: 'Proverb' },
  { text: 'Patience is bitter, but its fruit is sweet.', author: 'Aristotle' },
  { text: 'Books are the quietest and most constant of friends.', author: 'Charles W. Eliot' },
  { text: 'Learning today leads to earning tomorrow.', author: 'Proverb' },
  { text: 'The mind is not a vessel to be filled, but a fire to be kindled.', author: 'Plutarch' },
  { text: 'Sharpen your axe before you cut the tree.', author: 'Proverb' },
  { text: 'Great things are done by a series of small things brought together.', author: 'Vincent van Gogh' },
  { text: 'If you want something done well, do it yourself.', author: 'Proverb' },
];

function IdiomsStrip() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * IDIOMS.length));
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % IDIOMS.length), 6000);
    return () => clearInterval(timer);
  }, []);
  const idiom = IDIOMS[index];
  return (
    <section className="glass rounded-2xl px-5 py-4 mt-5 flex items-center gap-4" aria-label="Daily wisdom">
      <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-indigo-950">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M9.6 4c-4.2.8-7 4-7 8.6 0 1.6.4 3.4 1.3 4.9.6-1.2.9-2.4 1-3.7-2.6-1-3-2.6-3-4.1 0-2.9 2.4-5 5.7-5.7L9.6 4zm9 0c-4.2.8-7 4-7 8.6 0 1.6.4 3.4 1.3 4.9.6-1.2.9-2.4 1-3.7-2.6-1-3-2.6-3-4.1 0-2.9 2.4-5 5.7-5.7L18.6 4z" />
        </svg>
      </span>
      <div key={index} className="idiom-fade min-w-0">
        <p className="text-sm sm:text-base font-semibold text-white leading-snug">“{idiom.text}”</p>
        <p className="text-xs text-aqua-300 mt-0.5">— {idiom.author}</p>
      </div>
    </section>
  );
}

// Quick-inspire flash — one short line, changing with a flash effect.
function QuickInspire() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUICK_INSPIRE.length));
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % QUICK_INSPIRE.length), 5000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span key={index} className="inspire-flash block mt-3 text-sm sm:text-base font-semibold text-emerald-200/90 italic leading-snug max-w-md mx-auto">
      “{QUICK_INSPIRE[index]}”
    </span>
  );
}

// Growing tree with leaves — "Improvement is Life".
function TreeIcon({ size = 46 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M32 58V36" stroke="#34d399" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M32 42c-2.2 4-2.2 7.4 0 10.6 2.2-3.2 2.2-6.6 0-10.6z" fill="#6ee7b7" />
      <path d="M22 30c-7.5-3-10.6-8.5-9.5-14 6.4-1 12 1 15 6.5 1.2-7.2 5.4-12.6 12-13.6 2.2 6.2-1 11.8-6.5 14.8 6.4 1.7 9.8 6.2 9.8 11.8-7.8.8-14.2-1.6-18.8-5.5" fill="#22c55e" />
      <path d="M20 33c-8.8 1-13 6.5-12 12 8.6 0 14.2-3.2 17-8.6 2.4 7.4 7.8 11.6 15.5 11.6 0-7.6-3.4-13-9-15.4" fill="#10b981" />
      <circle cx="45" cy="11" r="4.4" fill="#4ade80" />
      <path d="M11 59h42" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="21" r="3" fill="#bbf7d0" opacity="0.85" />
      <circle cx="39" cy="30" r="2.5" fill="#bbf7d0" opacity="0.75" />
      <circle cx="28" cy="36" r="2" fill="#a7f3d0" opacity="0.7" />
      <path d="M51 37c4-2 7-6 6-10-4 0-8 3-9 7l-1 3 4 0z" fill="#86efac" />
    </svg>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    api('/api/classes')
      .then((d) => setClasses(d.classes))
      .catch(() => {});
  }, []);

  const class11 = classes.find((k) => k.slug === 'class-11');
  const class11e = classes.find((k) => k.slug === 'class-11e');
  const subjects11 = class11?.subjects || [];
  const subjects11e = class11e?.subjects || [];
  const streak = streakDays();

  const loksewa = subjects11.find((s) => s.slug === 'loksewa');
  const gk = subjects11.find((s) => s.slug === 'general-knowledge');

  const buildOptions = ({ subjects, subjects11e, loksewa, gk }) => {
    const options = [
      {
        to: sectionPath('class-11'),
        name: 'Class 11',
        desc: 'All subjects · NCE syllabus',
        meta: `${subjects.length} subjects`,
        color: '#a78bfa',
        icon: (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        ),
      },
      {
        to: sectionPath('class-11e'),
        name: 'Class 11E',
        desc: 'Extra solutions edition',
        meta: subjects11e ? `${subjects11e.length} subjects` : '',
        color: '#f472b6',
        icon: (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <path d="M12 6v8M8 10h8" />
          </svg>
        ),
      },
      {
        to: sectionPath('class-12-test'),
        name: 'Class 12',
        desc: 'Higher secondary content',
        meta: 'Live · Physics',
        color: '#60a5fa',
        icon: (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10L12 5 2 10l10 5 10-5z" />
            <path d="M6 12.5V18c0 1.5 2.7 3.5 6 3.5s6-2 6-3.5v-5.5" />
          </svg>
        ),
      },
      {
        to: sectionPath('class-11', 'loksewa'),
        name: 'Loksewa Knowledge',
        desc: 'Service commission prep',
        meta: loksewa ? `${loksewa._count.chapters} chapters` : '',
        color: '#f59e0b',
        icon: (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18M8 6l-4 2c0 6 3 9 8 9s8-3 8-9l-4-2c0 3-1.5 4-4 4s-4-1-4-4z" />
            <path d="M6 12a6 6 0 0 0 12 0" opacity="0" />
          </svg>
        ),
      },
      {
        to: sectionPath('class-11', 'general-knowledge'),
        name: 'General Knowledge',
        desc: 'Awareness, facts & current affairs',
        meta: gk ? `${gk._count.chapters} chapters` : '',
        color: '#22d3ee',
        icon: (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
          </svg>
        ),
      },
    ];
    return options;
  };

  const options = buildOptions({
    subjects: subjects11,
    subjects11e,
    loksewa,
    gk,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Compact welcome */}
      <section className="hero-gradient glass rounded-2xl px-6 py-6 text-center relative overflow-hidden">
        <span
          aria-hidden="true"
          className="absolute -top-20 -right-16 w-64 h-64 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.35), transparent 70%)' }}
        />

        {/* Natural vibes — static decorations */}
        <span className="absolute -top-1.5 left-5 hidden sm:block pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 60 72" width="46" height="56" fill="none">
            <path d="M4 70 C 10 44, 22 26, 36 4" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
            <path d="M9 54 q9 -2 9 -10 q-9 -2 -9 10 z" fill="#4ade80" opacity="0.65" />
            <path d="M17 38 q9 -2 9 -10 q-9 -2 -9 10 z" fill="#22c55e" opacity="0.65" />
            <path d="M27 22 q9 -2 9 -10 q-9 -2 -9 10 z" fill="#a3e635" opacity="0.6" />
          </svg>
        </span>
        <span className="absolute top-2.5 right-7 hidden sm:block pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 60 28" width="54" height="25">
            <ellipse cx="20" cy="16" rx="16" ry="9" fill="#e2e8f0" opacity="0.4" />
            <ellipse cx="38" cy="18" rx="13" ry="7" fill="#cbd5e1" opacity="0.3" />
          </svg>
        </span>
        <span className="absolute right-12 bottom-3 hidden sm:block pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 40 34" width="30" height="26">
            <path d="M20 16 C10 4, 2 6, 2 14 C2 22, 12 24, 20 16 Z" fill="#c4b5fd" opacity="0.8" />
            <path d="M20 16 C30 4, 38 6, 38 14 C38 22, 28 24, 20 16 Z" fill="#a78bfa" opacity="0.8" />
            <path d="M20 16 C12 24, 6 26, 6 30 C12 32, 20 26, 20 16 Z" fill="#e9d5ff" opacity="0.7" />
            <path d="M20 16 C28 24, 34 26, 34 30 C28 32, 20 26, 20 16 Z" fill="#c4b5fd" opacity="0.7" />
            <rect x="19" y="6" width="2" height="22" rx="1" fill="#7c3aed" />
            <path d="M20 8 q-4 -5 -8 -4 M20 8 q4 -5 8 -4" stroke="#7c3aed" strokeWidth="1.2" fill="none" />
          </svg>
        </span>
        <span className="absolute bottom-2.5 left-4 hidden sm:block pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 40 24" width="34" height="20" fill="none">
            <path d="M2 20 C 10 12, 20 8, 36 2" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
            <path d="M8 17 q9 -1 9 -9 q-9 -1 -9 9 z" fill="#4ade80" opacity="0.6" />
            <path d="M18 12 q9 -1 9 -9 q-9 -1 -9 9 z" fill="#22c55e" opacity="0.6" />
          </svg>
        </span>

        <div className="relative z-10">
          <span className="relative inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 items-center justify-center shadow-lg shadow-emerald-400/40 ring-4 ring-emerald-400/15">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-2xl opacity-60"
              style={{ background: 'radial-gradient(circle at 50% 30%, rgba(190,242,100,0.55), transparent 70%)' }}
            />
            <TreeIcon size={50} />
          </span>
          <h1 className="mt-3 text-xl sm:text-2xl font-extrabold text-white">
            Improvement is Life
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {user ? `Keep growing, ${user.displayName || 'friend'}. ` : 'Small steps every day. '}
            Little by little, everything grows.
          </p>

          <QuickInspire />

          {/* Warm off-white streak bar — .topbar-warm styles this chip */}
          <span className="topbar-warm inline-flex items-center gap-1.5 mt-3 text-[11px] font-bold px-3 py-1 rounded-full border border-orange-300/40">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c2.5 4.5 5 6.5 5 10a5 5 0 1 1-10 0c0-3.5 2.5-5.5 5-10z" />
            </svg>
            {streak} day{streak === 1 ? '' : 's'} streak
          </span>
        </div>
      </section>

      <IdiomsStrip />

      <QuickReviewBox />

      {/* Four main sections */}
      <section className="mt-8">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-aqua-400 to-emerald-500" aria-hidden="true" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Choose Your Path</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {options.map((opt) => (
            <Link
              key={opt.to}
              to={opt.to}
              className="subject-card rounded-2xl p-5 flex flex-col"
              style={{ '--card-accent': opt.color }}
            >
              <span
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${opt.color}1f`, border: `1px solid ${opt.color}55`, color: opt.color }}
              >
                {opt.icon}
              </span>
              <h3 className="text-lg font-bold mt-4" style={{ color: opt.color }}>{opt.name}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed flex-1">{opt.desc}</p>
              <span
                className="mt-4 text-[11px] font-bold px-3 py-1.5 rounded-full self-start"
                style={{ background: `${opt.color}1a`, color: opt.color, border: `1px solid ${opt.color}40` }}
              >
                {opt.meta || 'Explore'}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
