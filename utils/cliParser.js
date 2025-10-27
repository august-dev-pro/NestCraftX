function parseCliArgs(args) {
  const parsed = {
    command: null,
    projectName: null,
    flags: {},
    positional: [],
    errors: []
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];

    if (i === 2 && !arg.startsWith('--')) {
      parsed.command = arg;
      continue;
    }

    if (i === 3 && !arg.startsWith('--') && parsed.command === 'new') {
      if (!isValidProjectName(arg)) {
        parsed.errors.push(`Nom de projet invalide: "${arg}". Utilisez uniquement des lettres, chiffres, tirets et underscores.`);
      }
      parsed.projectName = arg;
      continue;
    }

    if (arg.startsWith('--')) {
      const [key, value] = parseFlag(arg);
      const nextArg = args[i + 1];

      if (value !== null) {
        parsed.flags[key] = value;
      } else if (nextArg && !nextArg.startsWith('--')) {
        parsed.flags[key] = nextArg;
        i++;
      } else {
        parsed.flags[key] = true;
      }
    } else {
      parsed.positional.push(arg);
    }
  }

  validateFlags(parsed);
  return parsed;
}

function parseFlag(arg) {
  if (arg.includes('=')) {
    const [key, ...valueParts] = arg.slice(2).split('=');
    return [key, valueParts.join('=')];
  }
  return [arg.slice(2), null];
}

function isValidProjectName(name) {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

function validateFlags(parsed) {
  const validOrms = ['prisma', 'typeorm', 'mongoose'];
  const validModes = ['full', 'light'];

  if (parsed.flags.orm && !validOrms.includes(parsed.flags.orm)) {
    parsed.errors.push(`ORM invalide: "${parsed.flags.orm}". Valeurs acceptées: ${validOrms.join(', ')}`);
  }

  if (parsed.flags.mode && !validModes.includes(parsed.flags.mode)) {
    parsed.errors.push(`Mode invalide: "${parsed.flags.mode}". Valeurs acceptées: ${validModes.join(', ')}`);
  }

  if (parsed.flags.full && parsed.flags.light) {
    parsed.errors.push('Les flags --full et --light sont mutuellement exclusifs.');
  }
}

module.exports = { parseCliArgs };
