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
using System.Collections.Generic;
using System.Security.Principal;
using System.Security.AccessControl;

namespace SaadStudioInstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            if (!IsAdministrator())
            {
                try
                {
                    ProcessStartInfo proc = new ProcessStartInfo();
                    proc.UseShellExecute = true;
                    proc.WorkingDirectory = Environment.CurrentDirectory;
                    proc.FileName = Application.ExecutablePath;
                    proc.Verb = "runas";
                    Process.Start(proc);
                    return;
                }
                catch
                {
                    MessageBox.Show("Administrator privileges are required to install Adobe extension files. Please right-click SaadStudio-Setup.exe and select 'Run as Administrator'.", "Administrator Rights Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
            }

            Application.Run(new InstallerForm());
        }

        private static bool IsAdministrator()
        {
            try
            {
                WindowsIdentity identity = WindowsIdentity.GetCurrent();
                WindowsPrincipal principal = new WindowsPrincipal(identity);
                return principal.IsInRole(WindowsBuiltInRole.Administrator);
            }
            catch { return false; }
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
            progressBar.Value = 10;
            lblStatus.Text = "Configuring Adobe CSXS security permissions for all users...";
            lblStatus.ForeColor = Color.FromArgb(245, 158, 11);
            Application.DoEvents();

            try
            {
                // 1. Enable Registry Debug Mode in HKCU, HKLM, and ALL User SIDs in HKU
                string[] csxsKeys = new string[] { "CSXS.8", "CSXS.9", "CSXS.10", "CSXS.11", "CSXS.12", "CSXS.13", "CSXS.14", "CSXS.15", "CSXS.16" };
                foreach (var k in csxsKeys)
                {
                    try
                    {
                        using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\\\\Adobe\\\\" + k))
                        {
                            if (key != null) key.SetValue("PlayerDebugMode", "1", RegistryValueKind.String);
                        }
                    }
                    catch { }
                    try
                    {
                        using (RegistryKey keyLM = Registry.LocalMachine.CreateSubKey(@"Software\\\\Adobe\\\\" + k))
                        {
                            if (keyLM != null) keyLM.SetValue("PlayerDebugMode", "1", RegistryValueKind.String);
                        }
                    }
                    catch { }
                }

                // Iterate all logged in user SIDs in HKEY_USERS
                try
                {
                    using (RegistryKey usersKey = Registry.Users)
                    {
                        if (usersKey != null)
                        {
                            foreach (string sidName in usersKey.GetSubKeyNames())
                            {
                                if (sidName.StartsWith("S-1-5-21-") && !sidName.EndsWith("_Classes"))
                                {
                                    foreach (var k in csxsKeys)
                                    {
                                        try
                                        {
                                            using (RegistryKey sidCsxsKey = usersKey.CreateSubKey(sidName + @"\\\\Software\\\\Adobe\\\\" + k))
                                            {
                                                if (sidCsxsKey != null) sidCsxsKey.SetValue("PlayerDebugMode", "1", RegistryValueKind.String);
                                            }
                                        }
                                        catch { }
                                    }
                                }
                            }
                        }
                    }
                }
                catch { }

                progressBar.Value = 30;
                lblStatus.Text = "Cleaning up old & legacy Saad Studio extension files...";
                Application.DoEvents();

                // 2. Automatically purge ALL legacy Saad Studio extension folders
                PurgeOldSaadStudioExtensions();

                progressBar.Value = 50;
                lblStatus.Text = "Extracting bundled extension payload...";
                Application.DoEvents();

                // 3. Extract embedded payload zip to temp staging directory
                string tempZipPath = Path.Combine(Path.GetTempPath(), "SaadStudioPayload_" + Guid.NewGuid().ToString("N") + ".zip");
                string tempStagingDir = Path.Combine(Path.GetTempPath(), "SaadStudioStaging_" + Guid.NewGuid().ToString("N"));

                var asm = System.Reflection.Assembly.GetExecutingAssembly();
                using (Stream stream = asm.GetManifestResourceStream("SaadStudioInstaller.payload.zip"))
                {
                    if (stream == null) throw new Exception("Embedded payload resource stream not found inside installer binary.");
                    using (FileStream fs = File.Create(tempZipPath))
                    {
                        stream.CopyTo(fs);
                    }
                }

                if (!File.Exists(tempZipPath)) throw new Exception("Failed to write temporary zip payload to disk.");

                Directory.CreateDirectory(tempStagingDir);
                ZipFile.ExtractToDirectory(tempZipPath, tempStagingDir);

                progressBar.Value = 80;
                lblStatus.Text = "Installing extension files for all users...";
                Application.DoEvents();

                // 4. Primary Mandatory Target Directory with PROPER ABSOLUTE BACKSLASHES
                string sys86Base = @"C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions";
                if (!Directory.Exists(sys86Base)) Directory.CreateDirectory(sys86Base);

                string targetSystem86 = Path.Combine(sys86Base, "app.saadstudio.cep");
                string targetSystem64 = @"C:\\Program Files\\Common Files\\Adobe\\CEP\\extensions\\app.saadstudio.cep";

                // Deploy to C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\app.saadstudio.cep
                if (Directory.Exists(targetSystem86)) Directory.Delete(targetSystem86, true);
                Directory.CreateDirectory(targetSystem86);
                CopyDirectoryRecursive(tempStagingDir, targetSystem86);
                GrantFullPermissionsToEveryone(targetSystem86);

                // Secondary target: Program Files 64
                try
                {
                    if (Directory.Exists(targetSystem64)) Directory.Delete(targetSystem64, true);
                    Directory.CreateDirectory(targetSystem64);
                    CopyDirectoryRecursive(tempStagingDir, targetSystem64);
                    GrantFullPermissionsToEveryone(targetSystem64);
                }
                catch { }

                // Secondary target: Copy to ALL user profiles in C:\Users\*
                try
                {
                    string usersDir = @"C:\\Users";
                    if (Directory.Exists(usersDir))
                    {
                        foreach (string userFolder in Directory.GetDirectories(usersDir))
                        {
                            try
                            {
                                string userAppData = Path.Combine(userFolder, @"AppData\\Roaming\\Adobe\\CEP\\extensions\\app.saadstudio.cep");
                                string parentDir = Path.GetDirectoryName(userAppData);
                                if (Directory.Exists(Path.GetDirectoryName(parentDir)))
                                {
                                    if (Directory.Exists(userAppData)) Directory.Delete(userAppData, true);
                                    Directory.CreateDirectory(userAppData);
                                    CopyDirectoryRecursive(tempStagingDir, userAppData);
                                    GrantFullPermissionsToEveryone(userAppData);
                                }
                            }
                            catch { }
                        }
                    }
                }
                catch { }

                // Cleanup temp staging
                try { File.Delete(tempZipPath); } catch { }
                try { Directory.Delete(tempStagingDir, true); } catch { }

                // VERIFY PHYSICAL DIRECTORY CREATION
                string manifestCheck = Path.Combine(targetSystem86, "CSXS", "manifest.xml");
                if (!Directory.Exists(targetSystem86) || !File.Exists(manifestCheck))
                {
                    throw new Exception("MANDATORY INSTALLATION FAILED: Physical folder was not created at " + targetSystem86);
                }

                progressBar.Value = 100;
                lblStatus.Text = "✅ Installation completed successfully! Please restart Premiere Pro.";
                lblStatus.ForeColor = Color.FromArgb(34, 197, 94);

                isCompleted = true;
                btnInstall.Text = "✔   Finish & Exit";
                btnInstall.BackColor = Color.FromArgb(34, 197, 94);
                btnInstall.Enabled = true;

                MessageBox.Show(
                    "Saad Studio 2.0.0 has been successfully installed and activated for ALL accounts!\\n\\nInstalled to:\\n" + targetSystem86 + "\\n\\nIMPORTANT:\\nPlease close and restart Premiere Pro, After Effects, or Photoshop if open, then go to:\\nWindow -> Extensions -> Saad Studio 2.0.0\\n\\nOfficial Website: https://saadstudio.app",
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
                MessageBox.Show("CRITICAL INSTALLATION FAILURE:\\n\\n" + ex.Message, "Installation Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static void PurgeOldSaadStudioExtensions()
        {
            string[] basePaths = new string[] {
                @"C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions",
                @"C:\\Program Files\\Common Files\\Adobe\\CEP\\extensions",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"Adobe\\CEP\\extensions")
            };

            foreach (var basePath in basePaths)
            {
                if (!Directory.Exists(basePath)) continue;
                try
                {
                    var dirs = Directory.GetDirectories(basePath);
                    foreach (var dir in dirs)
                    {
                        string dirName = Path.GetFileName(dir).ToLowerInvariant();
                        if (dirName.Contains("saad"))
                        {
                            try { Directory.Delete(dir, true); } catch { }
                        }
                    }
                }
                catch { }
            }
        }

        private static void GrantFullPermissionsToEveryone(string folderPath)
        {
            try
            {
                if (!Directory.Exists(folderPath)) return;
                DirectoryInfo dInfo = new DirectoryInfo(folderPath);
                DirectorySecurity dSecurity = dInfo.GetAccessControl();
                
                SecurityIdentifier everyone = new SecurityIdentifier(WellKnownSidType.WorldSid, null);
                dSecurity.AddAccessRule(new FileSystemAccessRule(everyone, FileSystemRights.FullControl, InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
                
                SecurityIdentifier users = new SecurityIdentifier(WellKnownSidType.BuiltinUsersSid, null);
                dSecurity.AddAccessRule(new FileSystemAccessRule(users, FileSystemRights.FullControl, InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
                
                dInfo.SetAccessControl(dSecurity);
            }
            catch { }
        }

        private static void CopyDirectoryRecursive(string sourceDir, string targetDir)
        {
            Directory.CreateDirectory(targetDir);
            foreach (string file in Directory.GetFiles(sourceDir))
            {
                string dest = Path.Combine(targetDir, Path.GetFileName(file));
                File.Copy(file, dest, true);
            }
            foreach (string subDir in Directory.GetDirectories(sourceDir))
            {
                string dest = Path.Combine(targetDir, Path.GetFileName(subDir));
                CopyDirectoryRecursive(subDir, dest);
            }
        }
    }
}
`;

fs.writeFileSync(path.join(__dirname, 'Installer.cs'), code, 'utf8');
console.log('Successfully generated Installer.cs with proper escaped double-backslashes!');
