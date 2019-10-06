const gulp = require("gulp"),
  autoprefixer = require("gulp-autoprefixer"),
  async = require("async"),
  browserSync = require("browser-sync").create(),
  cache = require("gulp-cache"),
  concat = require("gulp-concat"),
  consolidate = require("gulp-consolidate"),
  cssnano = require("gulp-cssnano"),
  del = require("del"),
  iconfont = require("gulp-iconfont"),
  imagemin = require("gulp-imagemin"),
  minify = require("gulp-minify"),
  panini = require("panini"),
  sass = require("gulp-sass"),
  sourcemaps = require("gulp-sourcemaps");

var reload = browserSync.reload;

// ------------ Development Tasks -------------
// Compile Sass into CSS
function styles() {
  return gulp
    .src(["src/assets/scss/*.scss"])
    .pipe(sourcemaps.init())
    .pipe(
      sass({
        outputStyle: "expanded",
        sourceComments: "map",
        sourceMap: "sass",
        outputStyle: "nested"
      }).on("error", sass.logError)
    )
    .pipe(autoprefixer("last 2 versions"))
    .pipe(concat("main.min.css"))
    .pipe(cssnano()) // Use cssnano to minify CSS
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("dist/assets/css"))
    .pipe(browserSync.stream());
}

// Using panini, template, page and partial files are combined to form html markup
function compileHtml() {
  return gulp
    .src("src/html/pages/**/*.html")
    .pipe(
      panini({
        root: "src/html/pages/",
        layouts: "src/html/layouts/",
        partials: "src/html/partials/",
        helpers: "src/html/helpers/",
        data: "src/html/data/"
      })
    )
    .pipe(gulp.dest("dist"));
}

function resetPages(done) {
  panini.refresh();
  done();
  console.log("Clearing panini cache");
}

// Watches for changes while gulp is running
function watch() {
  // Live reload with BrowserSync
  console.log("watch loading");
  browserSync.init({
    server: "./dist"
  });

  gulp.watch(["src/assets/js/**/*.js"], scripts).on("change", reload);
  gulp.watch(["src/assets/scss/**/*"], styles).on("change", reload);
  gulp.watch(["src/assets/img/**/*"], images);
  gulp.watch(["src/assets/video/**/*"], media);
  gulp
    .watch(["src/html/**/*.html"], gulp.series(resetPages, compileHtml))
    .on("change", reload);
  console.log("Watching for changes");
}

// ------------ Optimization Tasks -------------
// Copies image files to dist

function images() {
  return gulp
    .src("src/assets/img/**/*.+(png|jpg|jpeg|gif|svg)")
    .pipe(
      cache(
        imagemin([
          imagemin.gifsicle({ interlaced: true }),
          imagemin.jpegtran({ progressive: true }),
          imagemin.optipng({ optimizationLevel: 5 })
        ])
      )
    ) // Caching images that ran through imagemin
    .pipe(gulp.dest("dist/assets/img/"));
}

// Copies video assets to dist
function media() {
  return gulp
    .src("src/assets/video/**/*")
    .pipe(gulp.dest("dist/assets/video/"));
}

// Places font files in the dist folder
function font() {
  return gulp
    .src("src/assets/fonts/**/*.+(eot|woff|ttf|otf)")
    .pipe(gulp.dest("dist/assets/fonts"))
    .pipe(browserSync.stream());
}

// Concatenating js files
function scripts() {
  return gulp
    .src("src/assets/js/**/*.js")
    .pipe(sourcemaps.init())
    .pipe(concat("bundle.min.js"))
    .pipe(sourcemaps.write("./"))
    .pipe(minify())
    .pipe(gulp.dest("dist/assets/js/"))
    .pipe(browserSync.stream());
}

// Cleaning/deleting files no longer being used in dist folder
async function cleanDist() {
  console.log("Removing old files from dist");
  return del.sync("dist");
}

async function iconFontTask(done) {
  var iconStream = gulp
    .src(["assets/icons/*.svg"])
    .pipe(iconfont({ fontName: "myfont" }));

  return async.parallel(
    [
      function handleGlyphs(cb) {
        iconStream.on("glyphs", function(glyphs, options) {
          gulp
            .src("templates/myfont.css")
            .pipe(
              consolidate("lodash", {
                glyphs: glyphs,
                fontName: "myfont",
                fontPath: "../fonts/",
                className: "s"
              })
            )
            .pipe(gulp.dest("www/css/"))
            .on("finish", cb);
        });
      },
      function handleFonts(cb) {
        iconStream.pipe(gulp.dest("www/fonts/")).on("finish", cb);
      }
    ],
    done
  );
}

// exports.css = css;
// exports.compileHtml = compileHtml;
// exports.resetPages = resetPages;
// exports.watch = watch;
// exports.images = images;
// exports.media = media;
// exports.font = font;
// exports.scripts = scripts;
// exports.cleanDist = cleanDist;
// exports.iconFontTask = iconFontTask;

// ------------ Build Sequence -------------
exports.default = gulp.series(
  cleanDist,
  styles,
  font,
  scripts,
  images,
  compileHtml,
  resetPages,
  media,
  watch
);

// Creates production ready assets in dist folder
exports.build = gulp.series(
  cleanDist,
  styles,
  gulp.parallel(scripts, images, font, compileHtml)
);
