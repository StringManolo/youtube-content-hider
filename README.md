# YouTube Content Hider & Debugger

![YouTube Content Hider](https://img.shields.io/badge/YouTube-Content%20Hider-red)
![Version](https://img.shields.io/badge/version-4.7-blue)

A powerful userscript that allows you to hide/show YouTube Shorts and Posts with an intuitive debug interface.

## Demo



## Features

- **Hide Shorts & Posts by default** - Clean YouTube feed without distracting content
- **Toggle controls** - Easily show/hide Shorts and Posts when needed
- **Debug interface** - Optional debug panel for monitoring and troubleshooting
- **Cross-platform** - Works on desktop and mobile YouTube
- **Non-intrusive** - Only shows a small debug button by default
- **Draggable UI** - Move controls anywhere on screen
- **Real-time scanning** - Automatically detects and processes new content
- **Highlight mode** - Visually identify hidden elements for debugging

## Installation

### Desktop Browsers (Chrome, Firefox, Brave, Edge)

1. **Install a userscript manager extension:**
   - Chrome/Brave/Edge: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Greasemonkey](https://addons.mozilla.org/firefox/addon/greasemonkey/) or [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/)

2. **Download the script:**
   - Click the download button below to save the script
   - Open your userscript manager
   - Click "Create a new script"
   - Paste the entire script code
   - Save (Ctrl+S or Cmd+S)
   - Refresh YouTube

   Click this direct download link: [Download YouTube Content Hider](https://github.com/StringManolo/youtube-content-hider/releases/download/V4.7/youtube-content-hider.user.js)

### Android (Cromite Browser)

1. Open Cromite browser
2. Go to Settings → UserScripts
3. Download the script [clicking here](https://github.com/StringManolo/youtube-content-hider/releases/download/V4.7/youtube-content-hider.user.js)
4. Tap the "+" button select the file from your downloads folder
5. Enable the script
6. Reload YouTube

## Usage

1. **Default behavior:** Script automatically hides Shorts and Posts
2. **Access controls:** Click the "🔧 Debug" button in bottom-left corner
3. **Control panel:**
   - **Hide/Show Shorts** - Toggle Shorts visibility
   - **Hide/Show Posts** - Toggle Posts visibility
   - **Highlight Elements** - Mark hidden elements in red
   - **Show/Hide Logs** - Toggle debug logs panel

4. **Move Button:** Drag the debug button around

## Advanced Configuration

The script includes these default settings (editable in the script code):

```javascript
const config = {
  hideShortsByDefault: true,    // Hide Shorts by default
  hidePostsByDefault: true,     // Hide Posts by default
  showDebugButton: true,        // Show debug button
  autoHideDelay: 2000,          // Auto-hide delay in ms
  scanInterval: 5000            // Scan interval in ms
};
```

## Troubleshooting

### Script not working?
1. Ensure your userscript manager is enabled
2. Check that the script is enabled
3. Refresh YouTube page

### Debug button not showing?
1. Script might not be loading on the current page
2. Check script matches in Tampermonkey dashboard
3. Ensure YouTube URL is correct (https://youtube.com/ or https://m.youtube.com)

### Elements not being hidden?
1. YouTube might have updated their HTML structure
2. Click "Highlight Elements" to see what's being detected
3. Check logs for error messages

## Development

### Modifying the Script

To modify the script for your needs:

1. **Change default behavior:** Edit the `config` object at the top of the script
2. **Add new selectors:** Edit the `selectors` arrays (shorts and posts)
3. **Modify UI:** Edit the CSS in the `injectStyles()` function
4. **Change logging:** Modify the `addLog()` function

### Building

This is a pure userscript - no build process required. Just edit the .js file directly.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support

If you find this script useful, consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs or issues
- 💡 Suggesting new features
- 🔧 Contributing code improvements

## Disclaimer

This script is not affiliated with, endorsed by, or in any way associated with YouTube or Google. The script modifies the appearance of YouTube but does not interact with YouTube's servers or violate their terms of service.
---

**Made by [StringManolo](https://github.com/StringManolo)**

*If this script makes your YouTube experience better, consider sharing it with others!*
