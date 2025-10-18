function parseCliArgs(args) {
  const parsed = {
    command: null,
    projectName: null,
    flags: {},
    positional: []
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];

    if (i === 2 && !arg.startsWith('--')) {
      parsed.command = arg;
      continue;
    }

    if (i === 3 && !arg.startsWith('--') && parsed.command === 'new') {
      parsed.projectName = arg;
      continue;
    }

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        parsed.flags[key] = nextArg;
        i++;
      } else {
        parsed.flags[key] = true;
      }
    } else {
      parsed.positional.push(arg);
    }
  }

  return parsed;
}

module.exports = { parseCliArgs };
