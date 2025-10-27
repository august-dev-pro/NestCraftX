const { info, success, error: errorColor } = require('./colors');

class Spinner {
  constructor(text = 'Loading...') {
    this.text = text;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.currentFrame = 0;
    this.intervalId = null;
    this.isSpinning = false;
  }

  start() {
    if (this.isSpinning) return;

    this.isSpinning = true;
    this.currentFrame = 0;

    process.stdout.write('\n');

    this.intervalId = setInterval(() => {
      const frame = this.frames[this.currentFrame];
      process.stdout.write(`\r${info(frame)} ${this.text}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);
  }

  stop() {
    if (!this.isSpinning) return;

    this.isSpinning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    process.stdout.write('\r' + ' '.repeat(this.text.length + 10) + '\r');
  }

  succeed(text) {
    this.stop();
    console.log(success('✓') + ` ${text || this.text}`);
  }

  fail(text) {
    this.stop();
    console.log(errorColor('✗') + ` ${text || this.text}`);
  }

  update(text) {
    this.text = text;
  }
}

function spinner(text) {
  return new Spinner(text);
}

module.exports = { Spinner, spinner };
