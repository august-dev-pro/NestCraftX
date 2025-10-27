const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function success(text) {
  return colorize(text, 'green');
}

function error(text) {
  return colorize(text, 'red');
}

function warning(text) {
  return colorize(text, 'yellow');
}

function info(text) {
  return colorize(text, 'cyan');
}

function bold(text) {
  return `${colors.bold}${text}${colors.reset}`;
}

function dim(text) {
  return `${colors.dim}${text}${colors.reset}`;
}

module.exports = {
  colors,
  colorize,
  success,
  error,
  warning,
  info,
  bold,
  dim
};
