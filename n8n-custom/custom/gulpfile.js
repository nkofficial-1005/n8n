const gulp = require('gulp');
const rename = require('gulp-rename');

gulp.task('build:icons', () => {
  return gulp.src(['./nodes/**/*.svg', './credentials/**/*.svg'], { allowEmpty: true })
    .pipe(rename({ dirname: '' }))
    .pipe(gulp.dest('./dist'));
});
