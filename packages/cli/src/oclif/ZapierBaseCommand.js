const { Command } = require('@oclif/command');
const colors = require('colors/safe');

const { startSpinner, endSpinner, formatStyles } = require('../utils/display');
const { isValidAppInstall } = require('../utils/misc');

const inquirer = require('inquirer');

const DATA_FORMATS = ['json', 'raw'];

class ZapierBaseCommand extends Command {
  run() {
    this._parseFlags();
    if (this.flags.debug) {
      this.debug.enabled = true; // enables this.debug on the command
      require('debug').enable('zapier:*'); // enables all further spawned functions, like API
    }

    this.debug('args are', this.args);
    this.debug('flags are', this.flags);
    this.debug('------------');

    this.throwForInvalidAppInstall();

    return this.perform().catch(e => {
      this.stopSpinner({ success: false });
      const errTextLines = [e.message];

      this.debug(e.stack);

      if (!this.flags.debug) {
        errTextLines.push(
          colors.gray('re-run this command with `--debug` for more info')
        );
      }

      this.error(errTextLines.join('\n\n'));
    });
  }

  _parseFlags() {
    const { flags, args } = this.parse(Object.getPrototypeOf(this).constructor);

    this.flags = flags;
    this.args = args;
  }

  perform() {
    this.error(`subclass the "perform" method in the "${this.id}" command`);
  }

  // ; put ina method so we can disable it easily in tests
  throwForInvalidAppInstall() {
    const { valid, reason } = isValidAppInstall(this.id);
    if (!valid) {
      this.error(reason);
    }
  }

  // UTILS
  /**
   * Helps us not have helpful UI messages when the whole output should only be JSON.
   * @param  {...any} message the joined string to print out
   */
  log(...message) {
    if (this._shouldPrintData()) {
      super.log(...message);
    }
  }

  // we may not end up needing this
  logJSON(o) {
    if (typeof o === 'string') {
      console.log(o);
    } else {
      console.log(JSON.stringify(o, null, 2));
    }
  }

  /**
   * log data in table form
   * @param {Object} opts
   * @param {any[]} opts.rows The data to display
   * @param {string[][]} opts.headers Array of pairs of the column header and the key in the row that that header applies to
   * @param {string} opts.emptyMessage a message to print if there's no data
   * @param {boolean} opts.usedRowBasedTable override format and use `row` instead
   */
  logTable({
    rows = [],
    headers = [],
    emptyMessage = '',
    usedRowBasedTable = false
  } = {}) {
    const formatter = usedRowBasedTable
      ? formatStyles.row
      : formatStyles[this.flags.format];
    if (!formatter) {
      // throwing this error ensures that all commands that call this function take a format flag, since that provides the default
      this.error(`invalid table format: ${this.flags.format}`);
    }
    if (!rows.length && this._shouldPrintData()) {
      this.log(emptyMessage);
    } else {
      // data comes out of the formatter ready to be printed (and it's always in the type to match the format) so we don't need to do anything special with it
      console.log(formatter(rows, headers));
    }
  }

  /**
   * get user input
   * @param {string} question the question to ask the user
   * @param {object} opts `inquierer.js` opts ([read more](https://github.com/SBoudrias/Inquirer.js/#question))
   */
  async prompt(question, opts = {}) {
    const { ans } = await inquirer.prompt({
      type: 'string',
      ...opts,
      name: 'ans',
      message: question
    });
    return ans;
  }

  promptHidden(question) {
    return this.prompt(question, {
      type: 'password',
      mask: true
    });
  }

  confirm(message, defaultAns = false) {
    return this.prompt(message, { default: defaultAns, type: 'confirm' });
  }

  /**
   * should only print to stdout when in a non-data mode
   */
  _shouldPrintData() {
    return !this.flags.format || !DATA_FORMATS.includes(this.flags.format);
  }

  startSpinner(message) {
    startSpinner(message);
  }

  stopSpinner({ success = true, message = undefined } = {}) {
    endSpinner(success, message);
  }
}

module.exports = ZapierBaseCommand;
