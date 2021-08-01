import * as os from 'os';

export const platform = () => process.platform;
export const sysUptime = () => os.uptime();
export const processUptime = () => process.uptime();

// Memory
export const freemem = () => os.freemem() / (1024 * 1024);
export const totalmem = () => os.totalmem() / (1024 * 1024);
export const freememPercentage = () => os.freemem() / os.totalmem() * 100;
export const scriptmem = () => process.memoryUsage().heapUsed / 1024 / 1024;

// CPU
export const cpuCount = () => os.cpus().length;
export const getCPUInfo = () => {
  const cpus = os.cpus();

  let user = 0;
  let nice = 0;
  let sys = 0;
  let idle = 0;
  let irq = 0;
  let total = 0;

  for(const cpu in cpus){
      if (!cpus.hasOwnProperty(cpu)) {
        continue;
      }

      user += cpus[cpu].times.user;
      nice += cpus[cpu].times.nice;
      sys += cpus[cpu].times.sys;
      irq += cpus[cpu].times.irq;
      idle += cpus[cpu].times.idle;
  }

  total = user + nice + sys + idle + irq;

  return { idle, total };
}
export const getCPUUsage = (free = true): Promise<number> => {
  const stats1 = getCPUInfo();
  const startIdle = stats1.idle;
  const startTotal = stats1.total;

  const p: Promise<any> = new Promise(resolve => {
    setTimeout(
      () => {
        const stats2 = getCPUInfo();
        const endIdle = stats2.idle;
        const endTotal = stats2.total;

        const idle 	= endIdle - startIdle;
        const total 	= endTotal - startTotal;
        const perc	= idle / total;

        resolve(free ? perc : (1 - perc));
      },
      1000
    );
  });

  return p;
}
export const cpuFree = getCPUUsage.bind(null, true);
export const cpuUsage = getCPUUsage.bind(null, false);

export const getOverallUsage = async () => {
  return {
    systemUptime: sysUptime(),
    processUptime: processUptime(),
    freeMemory: freemem(),
    totalMemory: totalmem(),
    freeMemoryPercentage: freememPercentage(),
    processMemory: scriptmem(),
    cpuUsage: await cpuUsage()
  };
};
