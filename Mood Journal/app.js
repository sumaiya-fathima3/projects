const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

const moodOptions = [
  { name: 'Happy', emoji: '😊', color: '#f7c948' },
  { name: 'Calm', emoji: '😌', color: '#4ecdc4' },
  { name: 'Focused', emoji: '🎯', color: '#5b8def' },
  { name: 'Tired', emoji: '😴', color: '#8e8e93' },
  { name: 'Stressed', emoji: '😣', color: '#ff7a59' },
  { name: 'Sad', emoji: '😔', color: '#6c7ae0' },
  { name: 'Excited', emoji: '🤩', color: '#ff5c8a' }
];

let nextId = 4;
const entries = [
  {
    id: 1,
    date: '2026-05-28',
    mood: 'Calm',
    intensity: 7,
    sleepHours: 7.5,
    activity: 'Evening walk',
    note: 'Had a slower day and felt more grounded after getting outside.'
  },
  {
    id: 2,
    date: '2026-05-29',
    mood: 'Focused',
    intensity: 8,
    sleepHours: 6.5,
    activity: 'Study session',
    note: 'Finished the important tasks early and kept distractions low.'
  },
  {
    id: 3,
    date: '2026-05-30',
    mood: 'Happy',
    intensity: 9,
    sleepHours: 8,
    activity: 'Coffee with friends',
    note: 'Good energy today. Talking with friends helped a lot.'
  }
];

function findMood(name) {
  return moodOptions.find((option) => option.name === name) || moodOptions[0];
}

function buildStats() {
  const totalEntries = entries.length;
  const averageIntensity = totalEntries
    ? (entries.reduce((sum, entry) => sum + Number(entry.intensity), 0) / totalEntries).toFixed(1)
    : '0.0';
  const averageSleep = totalEntries
    ? (entries.reduce((sum, entry) => sum + Number(entry.sleepHours || 0), 0) / totalEntries).toFixed(1)
    : '0.0';

  const moodCounts = entries.reduce((counts, entry) => {
    counts[entry.mood] = (counts[entry.mood] || 0) + 1;
    return counts;
  }, {});

  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No moods yet';

  return {
    totalEntries,
    averageIntensity,
    averageSleep,
    topMood
  };
}

function buildCalendarHeatmap() {
  const today = new Date();
  const latestEntry = sortedEntries()[0];
  const calendarDate = latestEntry ? new Date(`${latestEntry.date}T00:00:00`) : today;
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const entriesByDate = new Map();

  [...entries]
    .sort((a, b) => a.id - b.id)
    .forEach((entry) => {
      const entryDate = new Date(`${entry.date}T00:00:00`);

      if (entryDate.getFullYear() === year && entryDate.getMonth() === month) {
        entriesByDate.set(entry.date, entry);
      }
    });

  const days = [];

  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = entriesByDate.get(date);
    const mood = entry ? findMood(entry.mood) : null;

    days.push({
      day,
      date,
      entry,
      mood,
      color: mood ? mood.color : '#e5e7eb'
    });
  }

  return {
    monthLabel: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    days
  };
}

function sortedEntries() {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function normalizeEntry(body) {
  return {
    date: body.date,
    mood: body.mood,
    intensity: Number(body.intensity),
    sleepHours: Number(body.sleepHours || 0),
    activity: body.activity.trim(),
    note: body.note.trim()
  };
}

app.get('/', (req, res) => {
  res.render('index', {
    title: 'LumaMood Dashboard',
    moodOptions,
    entries: sortedEntries(),
    stats: buildStats(),
    calendar: buildCalendarHeatmap(),
    findMood
  });
});

app.get('/moods/new', (req, res) => {
  res.render('new', {
    title: 'Add Mood Entry',
    moodOptions,
    entry: {
      date: new Date().toISOString().slice(0, 10),
      mood: 'Happy',
      intensity: 5,
      sleepHours: 7,
      activity: '',
      note: ''
    }
  });
});

app.get('/about', (req, res) => {
  res.render('about', {
    title: 'About LumaMood'
  });
});

app.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact LumaMood'
  });
});

app.post('/moods', (req, res) => {
  entries.push({
    id: nextId++,
    ...normalizeEntry(req.body)
  });
  res.redirect('/');
});

app.get('/moods/:id', (req, res) => {
  const entry = entries.find((item) => item.id === Number(req.params.id));

  if (!entry) {
    return res.status(404).render('not-found', { title: 'Mood Not Found' });
  }

  res.render('show', {
    title: `${entry.mood} Mood Entry`,
    entry,
    mood: findMood(entry.mood)
  });
});

app.get('/moods/:id/edit', (req, res) => {
  const entry = entries.find((item) => item.id === Number(req.params.id));

  if (!entry) {
    return res.status(404).render('not-found', { title: 'Mood Not Found' });
  }

  res.render('edit', {
    title: 'Edit Mood Entry',
    moodOptions,
    entry
  });
});

app.post('/moods/:id', (req, res) => {
  const entryIndex = entries.findIndex((item) => item.id === Number(req.params.id));

  if (entryIndex === -1) {
    return res.status(404).render('not-found', { title: 'Mood Not Found' });
  }

  entries[entryIndex] = {
    id: Number(req.params.id),
    ...normalizeEntry(req.body)
  };

  res.redirect(`/moods/${req.params.id}`);
});

app.post('/moods/:id/delete', (req, res) => {
  const entryIndex = entries.findIndex((item) => item.id === Number(req.params.id));

  if (entryIndex !== -1) {
    entries.splice(entryIndex, 1);
  }

  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`LumaMood running at http://localhost:${PORT}`);
});
