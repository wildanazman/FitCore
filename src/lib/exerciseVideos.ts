export interface ExerciseVideo {
  name: string
  video: string
  gif: string
  poster: string
  sourceUrl: string
  author: string
  licenseUrl: string
}
// Derived media is CC BY-SA 4.0, not application code. See the asset attribution file.
function wger(id: string, name: string, sourceId: number): ExerciseVideo {
  return {
    name, video: `/exercise-demos/${id}.mp4`, gif: `/exercise-demos/${id}.gif`,
    poster: `/exercise-demos/${id}.jpg`, author: 'Goulart',
    sourceUrl: `https://wger.de/api/v2/exerciseinfo/${sourceId}/`,
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  }
}
export const EXERCISE_VIDEOS: Record<string, ExerciseVideo> = {
  home_db_bench_press: wger('home_db_bench_press', 'Dumbbell bench press', 75),
  bench_press: wger('bench_press', 'Barbell bench press', 73),
  home_db_kickback: wger('home_db_kickback', 'Dumbbell triceps kickback', 655),
  home_db_curl: wger('home_db_curl', 'Dumbbell biceps curl', 92),
  home_db_hammer_curl: wger('home_db_hammer_curl', 'Dumbbell hammer curl', 272),
  home_db_lateral_raise: wger('home_db_lateral_raise', 'Dumbbell lateral raise', 348),
  home_bodyweight_squat: {
    name: 'Bodyweight squat', video: '/exercise-demos/home_bodyweight_squat.mp4',
    gif: '/exercise-demos/home_bodyweight_squat.gif', poster: '/exercise-demos/home_bodyweight_squat.jpg',
    author: 'Danielflefil', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bodyweight_Squats.gif',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  squat: {
    name: 'Barbell squat', video: '/exercise-demos/squat.mp4',
    gif: '/exercise-demos/squat.gif', poster: '/exercise-demos/squat.jpg',
    author: 'FitnessScape', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Squat_-_exercise_demonstration_video.webm',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
}
