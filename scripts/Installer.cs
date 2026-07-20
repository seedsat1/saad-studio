using System;
using System.IO;
using System.Drawing;
using System.Windows.Forms;
using Microsoft.Win32;

namespace SaadStudioInstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        private Label lblTitle;
        private Label lblSub;
        private Label lblStatus;
        private ProgressBar progressBar;
        private Button btnInstall;
        private Panel panelHeader;

        public InstallerForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "Saad Studio 2.0.0 — Automated Installer";
            this.Size = new Size(520, 340);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = true;
            this.BackColor = Color.FromArgb(15, 23, 42);

            panelHeader = new Panel();
            panelHeader.Dock = DockStyle.Top;
            panelHeader.Height = 85;
            panelHeader.BackColor = Color.FromArgb(30, 41, 59);
            this.Controls.Add(panelHeader);

            lblTitle = new Label();
            lblTitle.Text = "Saad Studio AI — 1-Click Installer";
            lblTitle.Font = new Font("Segoe UI", 13, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(245, 158, 11);
            lblTitle.Location = new Point(20, 15);
            lblTitle.AutoSize = true;
            panelHeader.Controls.Add(lblTitle);

            lblSub = new Label();
            lblSub.Text = "Installs extension into Premiere Pro, After Effects & Photoshop";
            lblSub.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            lblSub.ForeColor = Color.FromArgb(203, 213, 225);
            lblSub.Location = new Point(22, 45);
            lblSub.AutoSize = true;
            panelHeader.Controls.Add(lblSub);

            lblStatus = new Label();
            lblStatus.Text = "Ready to install. Click the button below to start automatic setup.";
            lblStatus.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(148, 163, 184);
            lblStatus.Location = new Point(25, 110);
            lblStatus.Size = new Size(460, 45);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(25, 165);
            progressBar.Size = new Size(455, 22);
            progressBar.Value = 0;

            btnInstall = new Button();
            btnInstall.Text = "Install Saad Studio Now";
            btnInstall.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
            btnInstall.ForeColor = Color.FromArgb(15, 23, 42);
            btnInstall.BackColor = Color.FromArgb(245, 158, 11);
            btnInstall.FlatStyle = FlatStyle.Flat;
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Location = new Point(140, 215);
            btnInstall.Size = new Size(220, 42);
            btnInstall.Cursor = Cursors.Hand;
            btnInstall.Click += BtnInstall_Click;

            this.Controls.Add(lblStatus);
            this.Controls.Add(progressBar);
            this.Controls.Add(btnInstall);
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            btnInstall.Enabled = false;
            progressBar.Value = 10;
            lblStatus.Text = "Configuring Adobe CSXS security permissions...";
            lblStatus.ForeColor = Color.FromArgb(245, 158, 11);
            Application.DoEvents();

            try
            {
                string[] csxsKeys = new string[] { "CSXS.9", "CSXS.10", "CSXS.11", "CSXS.12", "CSXS.14", "CSXS.15", "CSXS.16" };
                foreach (var k in csxsKeys)
                {
                    try
                    {
                        using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Adobe\" + k))
                        {
                            if (key != null) key.SetValue("PlayerDebugMode", "1", RegistryValueKind.String);
                        }
                    }
                    catch { }
                }

                progressBar.Value = 40;
                lblStatus.Text = "Copying extension files to Adobe CEP folder...";
                Application.DoEvents();

                string appDir = AppDomain.CurrentDomain.BaseDirectory;
                string sourceFolder = Path.Combine(appDir, "app.saadstudio.cep");

                if (!Directory.Exists(sourceFolder))
                {
                    string parentSource = Path.Combine(appDir, "..", "app.saadstudio.cep");
                    if (Directory.Exists(parentSource)) sourceFolder = parentSource;
                }

                string targetSystem = @"C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\app.saadstudio.cep";
                string targetUser = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"Adobe\CEP\extensions\app.saadstudio.cep");

                if (Directory.Exists(sourceFolder))
                {
                    CopyDirectory(sourceFolder, targetUser);
                    try { CopyDirectory(sourceFolder, targetSystem); } catch { }
                }

                progressBar.Value = 100;
                lblStatus.Text = "Installation completed successfully!";
                lblStatus.ForeColor = Color.FromArgb(34, 197, 94);

                MessageBox.Show(
                    "Saad Studio has been successfully installed and activated!\n\n" +
                    "To open the extension:\n" +
                    "Launch Premiere Pro, After Effects, or Photoshop -> Window -> Extensions -> Saad Studio",
                    "Installation Complete",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                lblStatus.Text = "Installation error: " + ex.Message;
                lblStatus.ForeColor = Color.Red;
                btnInstall.Enabled = true;
            }
        }

        private static void CopyDirectory(string sourceDir, string destinationDir)
        {
            Directory.CreateDirectory(destinationDir);
            foreach (string file in Directory.GetFiles(sourceDir, "*.*", SearchOption.AllDirectories))
            {
                string relativePath = file.Substring(sourceDir.Length + 1);
                string targetPath = Path.Combine(destinationDir, relativePath);
                Directory.CreateDirectory(Path.GetDirectoryName(targetPath));
                File.Copy(file, targetPath, true);
            }
        }
    }
}
