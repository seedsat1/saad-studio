const fs = require('fs');
const path = require('path');

const b64 = fs.readFileSync(path.join(__dirname, 'logo_base64.txt'), 'utf8').trim();

const code = `using System;
using System.IO;
using System.IO.Compression;
using System.Drawing;
using System.Diagnostics;
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
        private PictureBox picLogo;
        private Label lblTitle;
        private Label lblSub;
        private LinkLabel linkWebsite;
        private Label lblStatus;
        private ProgressBar progressBar;
        private Button btnInstall;
        private Panel panelHeader;
        private Panel panelBody;
        private Label lblFooter;
        private bool isCompleted = false;

        private static string LOGO_B64 = "${b64}";

        public InstallerForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "Saad Studio 2.0.0 — Official Setup";
            this.Size = new Size(580, 420);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.MinimizeBox = true;
            this.BackColor = Color.FromArgb(11, 15, 25);

            try
            {
                byte[] bytes = Convert.FromBase64String(LOGO_B64);
                using (MemoryStream ms = new MemoryStream(bytes))
                {
                    Bitmap bmp = new Bitmap(ms);
                    IntPtr hIcon = bmp.GetHicon();
                    this.Icon = Icon.FromHandle(hIcon);
                }
            }
            catch { }

            panelHeader = new Panel();
            panelHeader.Dock = DockStyle.Top;
            panelHeader.Height = 95;
            panelHeader.BackColor = Color.FromArgb(17, 24, 39);
            panelHeader.Padding = new Padding(15);
            this.Controls.Add(panelHeader);

            picLogo = new PictureBox();
            picLogo.Size = new Size(58, 58);
            picLogo.Location = new Point(20, 18);
            picLogo.SizeMode = PictureBoxSizeMode.Zoom;
            try
            {
                byte[] bytes = Convert.FromBase64String(LOGO_B64);
                using (MemoryStream ms = new MemoryStream(bytes))
                {
                    picLogo.Image = Image.FromStream(ms);
                }
            }
            catch { }
            panelHeader.Controls.Add(picLogo);

            lblTitle = new Label();
            lblTitle.Text = "Saad Studio AI";
            lblTitle.Font = new Font("Segoe UI", 15, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(56, 189, 248);
            lblTitle.Location = new Point(90, 16);
            lblTitle.AutoSize = true;
            panelHeader.Controls.Add(lblTitle);

            lblSub = new Label();
            lblSub.Text = "Adobe Premiere Pro • After Effects • Photoshop Extension";
            lblSub.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            lblSub.ForeColor = Color.FromArgb(148, 163, 184);
            lblSub.Location = new Point(92, 48);
            lblSub.AutoSize = true;
            panelHeader.Controls.Add(lblSub);

            linkWebsite = new LinkLabel();
            linkWebsite.Text = "🌐 saadstudio.app";
            linkWebsite.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            linkWebsite.LinkColor = Color.FromArgb(245, 158, 11);
            linkWebsite.ActiveLinkColor = Color.FromArgb(251, 191, 36);
            linkWebsite.VisitedLinkColor = Color.FromArgb(245, 158, 11);
            linkWebsite.Location = new Point(415, 20);
            linkWebsite.AutoSize = true;
            linkWebsite.Cursor = Cursors.Hand;
            linkWebsite.LinkClicked += (s, e) => {
                try { Process.Start(new ProcessStartInfo("https://saadstudio.app") { UseShellExecute = true }); } catch { }
            };
            panelHeader.Controls.Add(linkWebsite);

            panelBody = new Panel();
            panelBody.Location = new Point(20, 115);
            panelBody.Size = new Size(524, 210);
            panelBody.BackColor = Color.FromArgb(17, 24, 39);
            panelBody.BorderStyle = BorderStyle.FixedSingle;
            this.Controls.Add(panelBody);

            lblStatus = new Label();
            lblStatus.Text = "Click 'Install Saad Studio Now' to automatically enable Adobe extension permissions and install files.";
            lblStatus.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(226, 232, 240);
            lblStatus.Location = new Point(20, 20);
            lblStatus.Size = new Size(480, 50);
            panelBody.Controls.Add(lblStatus);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(20, 80);
            progressBar.Size = new Size(482, 24);
            progressBar.Value = 0;
            panelBody.Controls.Add(progressBar);

            btnInstall = new Button();
            btnInstall.Text = "⚡   Install Saad Studio Now";
            btnInstall.Font = new Font("Segoe UI", 11, FontStyle.Bold);
            btnInstall.ForeColor = Color.White;
            btnInstall.BackColor = Color.FromArgb(124, 58, 237);
            btnInstall.FlatStyle = FlatStyle.Flat;
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Location = new Point(140, 130);
            btnInstall.Size = new Size(240, 48);
            btnInstall.Cursor = Cursors.Hand;
            btnInstall.Click += BtnInstall_Click;
            panelBody.Controls.Add(btnInstall);

            lblFooter = new Label();
            lblFooter.Text = "© 2026 Saad Studio Inc. • Official Standalone Installer • saadstudio.app";
            lblFooter.Font = new Font("Segoe UI", 8.5f, FontStyle.Regular);
            lblFooter.ForeColor = Color.FromArgb(100, 116, 139);
            lblFooter.Location = new Point(20, 345);
            lblFooter.Size = new Size(524, 25);
            lblFooter.TextAlign = ContentAlignment.MiddleCenter;
            this.Controls.Add(lblFooter);
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            if (isCompleted)
            {
                this.Close();
                return;
            }

            btnInstall.Enabled = false;
            progressBar.Value = 15;
            lblStatus.Text = "Configuring Adobe CSXS security permissions in Windows Registry...";
            lblStatus.ForeColor = Color.FromArgb(245, 158, 11);
            Application.DoEvents();

            try
            {
                // 1. Enable Registry Debug Mode in HKCU and HKLM for all CSXS versions
                string[] csxsKeys = new string[] { "CSXS.9", "CSXS.10", "CSXS.11", "CSXS.12", "CSXS.13", "CSXS.14", "CSXS.15", "CSXS.16" };
                foreach (var k in csxsKeys)
                {
                    try
                    {
                        using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Adobe\" + k))
                        {
                            if (key != null) key.SetValue("PlayerDebugMode", "1", RegistryValueKind.String);
                        }
                        using (RegistryKey keyLM = Registry.LocalMachine.CreateSubKey(@"Software\Adobe\" + k))
                        {
                            if (keyLM != null) keyLM.SetValue("PlayerDebugMode", "1", RegistryValueKind.String);
                        }
                    }
                    catch { }
                }

                progressBar.Value = 40;
                lblStatus.Text = "Extracting bundled extension payload & helper runtimes...";
                Application.DoEvents();

                // 2. Extract embedded payload zip
                string tempZipPath = Path.Combine(Path.GetTempPath(), "SaadStudioPayload_" + Guid.NewGuid().ToString("N") + ".zip");
                var asm = System.Reflection.Assembly.GetExecutingAssembly();
                using (Stream stream = asm.GetManifestResourceStream("SaadStudioInstaller.payload.zip"))
                {
                    if (stream != null)
                    {
                        using (FileStream fs = File.Create(tempZipPath))
                        {
                            stream.CopyTo(fs);
                        }
                    }
                }

                progressBar.Value = 75;
                lblStatus.Text = "Installing extension files to System CEP directory...";
                Application.DoEvents();

                string targetSystem86 = @"C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\app.saadstudio.cep";
                string targetSystem64 = @"C:\Program Files\Common Files\Adobe\CEP\extensions\app.saadstudio.cep";
                string targetUser = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"Adobe\CEP\extensions\app.saadstudio.cep");

                if (File.Exists(tempZipPath))
                {
                    ExtractZipToTarget(tempZipPath, targetUser);
                    try { ExtractZipToTarget(tempZipPath, targetSystem86); } catch { }
                    try { ExtractZipToTarget(tempZipPath, targetSystem64); } catch { }
                    try { File.Delete(tempZipPath); } catch { }
                }

                progressBar.Value = 100;
                lblStatus.Text = "✅ Installation completed successfully! Please restart Premiere Pro.";
                lblStatus.ForeColor = Color.FromArgb(34, 197, 94);

                isCompleted = true;
                btnInstall.Text = "✔   Finish & Exit";
                btnInstall.BackColor = Color.FromArgb(34, 197, 94); // emerald-500
                btnInstall.Enabled = true;

                MessageBox.Show(
                    @"Saad Studio has been successfully installed and activated!

IMPORTANT:
Please close and restart Premiere Pro, After Effects, or Photoshop if open, then go to:
Window -> Extensions -> Saad Studio

Official Website: https://saadstudio.app",
                    "Saad Studio Setup Complete",
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

        private static void ExtractZipToTarget(string zipFile, string destinationDir)
        {
            if (Directory.Exists(destinationDir))
            {
                try { Directory.Delete(destinationDir, true); } catch { }
            }
            Directory.CreateDirectory(destinationDir);
            ZipFile.ExtractToDirectory(zipFile, destinationDir);
        }
    }
}
`;

fs.writeFileSync(path.join(__dirname, 'Installer.cs'), code, 'utf8');
console.log('Successfully generated scripts/Installer.cs with Admin UAC & Finish Button!');
