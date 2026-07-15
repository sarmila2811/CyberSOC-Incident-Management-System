export const generateFakeAlert = () => {
  const alerts = [
    {
      title: "Firewall blocked suspicious IP",
      priority: "High",
      status: "Under Investigation"
    },
    {
      title: "Multiple failed login attempts detected",
      priority: "Critical",
      status: "Under Investigation"
    },
    {
      title: "Antivirus detected malware file",
      priority: "High",
      status: "Escalated"
    },
    {
      title: "Unusual data transfer detected",
      priority: "Critical",
      status: "Under Investigation"
    }
  ];

  const randomIndex = Math.floor(Math.random() * alerts.length);
  return alerts[randomIndex];
};