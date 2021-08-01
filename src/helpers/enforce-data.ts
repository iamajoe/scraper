// --------------------------------------------------
// Variables

// --------------------------------------------------
// Functions

export const enforceDataExists = (data: { [key: string]: any; }, keys: string[] = []) => {
  const errObj = {
    status: 400, // LEGACY: 20-03-2019
    code: 400,
    message: 'requirements are not fullfilled',
    originalErr : '',
  };

  if (data == null) { throw errObj; }
  if (Object.keys(data).length === 0) { throw errObj; }

  // lets iterate the keys and see if we have them all
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const value = data[key];

    if (value == null) {
      errObj.originalErr = `${key} key was not provided`;
      throw errObj;
    }

    // lets check more being a string
    if (typeof value === 'string') {
      if (
        value.length === 0 ||
        value === 'null' ||
        value === 'undefined' ||
        value === 'false'
      ) {
        throw errObj;
      }
    }

    // lets check more being an array
    if (Array.isArray(value) && value.length === 0) {
      throw errObj;
    }
  }
};
