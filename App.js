import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, IconButton,Button } from '@mui/material';
import { ResizableBox } from 'react-resizable';
import {Description as DescriptionIcon, SmartToy as SmartToyIcon} from '@mui/icons-material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import 'react-resizable/css/styles.css'; // 引入样式
import mammoth from 'mammoth'; // 用于解析 .docx 文档
import CircularProgress from '@mui/material/CircularProgress';
import * as pdfjsLib from 'pdfjs-dist';

function App() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [leftRatio, setLeftRatio] = useState(0.3); // 初始比例：左侧占 30%
  const [leftWidth, setLeftWidth] = useState(windowWidth * leftRatio); // 左侧宽度
  const [rightWidth, setRightWidth] = useState(windowWidth * (1 - leftRatio)); // 右侧宽度
  const [documentContent, setDocumentContent] = useState('这里将显示文档内容。'); // 左侧文档内容
  const [userQuestion, setUserQuestion] = useState(''); // 用户输入的问题
  const [aiResponse, setAiResponse] = useState('AI反馈内容将在这里显示。'); // AI 的回答
  const [loading, setLoading] = useState(false); // 加载状态
  const [question, setQuestion] = useState('');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

  // 动态监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      const newWindowWidth = window.innerWidth;

      // 根据比例调整左右宽度
      setLeftWidth(newWindowWidth * leftRatio);
      setRightWidth(newWindowWidth * (1 - leftRatio));

      setWindowWidth(newWindowWidth); // 更新窗口宽度
    };

    //首次挂载到页面时会添加监视器，所以不用担心没有被初始化
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [leftRatio]);

  // 动态调整发给后端的问题
  //这块是整个把文档和问题连接起来
  //如果做的更精细应该分开
  useEffect(() => {
    setQuestion(documentContent + "--------------------------------------\n以上是我的文本内容,我想问：" + userQuestion);
  }, [documentContent, userQuestion]);

  // 拖动分隔条后更新比例和宽度
  //左侧ResizableBox的onResizeStop监听
  //即resize停止后进行更新
  //参数e是点击事件
  //data是包含尺寸和位置信息的对象
  const handleResizeStop = (e, data) => {
    const newLeftWidth = data.size.width;
    const newLeftRatio = newLeftWidth / window.innerWidth;

    setLeftRatio(newLeftRatio); // 更新比例
    setLeftWidth(newLeftWidth); // 更新左侧宽度
    setRightWidth(window.innerWidth - newLeftWidth); // 更新右侧宽度
  };

  // 文件上传处理
  //和文件上传按钮绑定
  //event是交互事件
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 支持多种文件类型的解析
    if (file.type === 'text/plain') {
      const text = await file.text(); // 读取纯文本文件
      setDocumentContent(text);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      //arrayBuffer是转化成二进制数据
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setDocumentContent(result.value); // 设置文档内容
    } else if(file.type == 'application/pdf'){
      const text = await extractPdfText(file);
      setDocumentContent(text); // 设置文档内容
    } else {
      alert('不支持的文件类型');
    }
  };

  // 解析 PDF 文件并提取文本
  const extractPdfText = async (file) => {
    //URL的那个函数是用来暂时访问file文件内容
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let textContent = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(' ');
      textContent += text + '\n'; // 合并每一页的文本
    }
    return textContent;
  };

  //绑定于上传问题
  const handleQuestionSubmit = async () => {
    if (!userQuestion.trim()) {
      alert('请输入一个问题！');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiResponse(data.answer || '未收到有效的回答。');
      } else {
        setAiResponse('请求失败，请稍后再试。');
      }
    } catch (error) {
      console.error('Error:', error);
      setAiResponse('连接后端失败，请检查服务是否正常运行。');
    }

    setLoading(false);
  };

  //绑定于上传文档给后端
  // const handleFileSubmit = async () => {
  //   if (!documentContent.trim()) {
  //     alert('请输入一个问题！');
  //     return;
  //   }

  //   try {
  //     const response = await fetch('http://127.0.0.1:5000/upload', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ documentContent: documentContent }),
  //     });

  //后面还得更改后端
  //     if (response.ok) {
  //       const data = await response.json();
  //       setAiResponse(data.answer || '未收到有效的回答。');
  //     } else {
  //       setAiResponse('请求失败，请稍后再试。');
  //     }
  //   } catch (error) {
  //     console.error('Error:', error);
  //     setAiResponse('连接后端失败，请检查服务是否正常运行。');
  //   }

  // };

  return (
    <Box
      sx={{
        height: '100vh',
        background: 'linear-gradient(180deg, #f0f0f0, #ffffff)',
        padding: '20px',
        display: 'flex',
      }}
    >
      {/* 左侧区域：文档显示 */}
      <ResizableBox
        //width会根据leftWidth的值动态渲染
        width={leftWidth}
        height={Infinity}
        //以下只能水平拖动
        axis="x"
        //constraint[宽度，高度]
        minConstraints={[windowWidth * 0.2, 100]} // 最小宽度限制 20%
        maxConstraints={[windowWidth * 0.8, Infinity]} // 最大宽度限制 80%
        //e代指east,可以从右边拖动边界
        //不过有偏移量所以也无所谓
        resizeHandles={['e']}
        onResizeStop={handleResizeStop}
        //handle是拖动的把手
        handle={
          <div
            style={{
              width: '100px', // 拖动区域宽度
              height: '100%',
              position: 'absolute',
              top: 0,
              right: -50,
              cursor: 'ew-resize', // 鼠标指针样式
              zIndex: 10,
              backgroundColor: 'transparent', // 可选：设为透明
            }}
          />
        }
        style={{
          backgroundColor: '#fafafa',
          borderRadius: '10px',
          //参数解释
          //水平偏移、垂直偏移、模糊半径、阴影颜色和透明度
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          //内边距（和内部组件的距离）
          padding: '20px',
          display: 'flex',
          //元素垂直排布
          flexDirection: 'column',
          //外边距
          marginRight: '20px',
        }}
      >
        {/* alignItems: 'center'是垂直对齐子元素 */}
        <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          {/* DescriptionIcon就是文件图标 */}
          <DescriptionIcon color="primary" sx={{ marginRight: '10px' }} />
          <Typography variant="h5">
            文档预览
          </Typography>
        </Box>
        <Box
          //sx是MUI中的样式配置方法
          sx={{
            //flex:1是自动充满父容器
            flex: 1,
            border: '1px solid #ddd',
            padding: '10px',
            borderRadius: '8px',
            background: '#ffffff',
            overflowY: 'auto',
          }}
        >
          <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {documentContent}
          </Typography>
          {/* <TextField
            multiline
            fullWidth
            minRows={5}
            variant="standard"
            value={documentContent}
            onChange={(e) => setDocumentContent(e.target.value)} // 更新预览内容
            sx={{
              whiteSpace: 'pre-wrap', // 保留格式
              wordWrap: 'break-word',
              '& .MuiInput-underline:before': {
                borderBottom: 'none', // 去掉默认的底部边界线
              },
              '& .MuiInput-underline:hover:before': {
                borderBottom: 'none', // 去掉 hover 状态下的底部边界线
              },
              '& .MuiInput-underline:after': {
                borderBottom: 'none', // 去掉聚焦状态下的底部边界线
              },
            }}
          /> */}
        </Box>
        {/* variant是MUI中控制外观样式的属性 */}
        {/* component=‘label’是通过button联动触发input */}
        <Button variant="outlined" component="label" sx={{ marginTop: '20px' }}>
          上传文件
          <input
            type="file"
            hidden
            accept=".txt,.docx,.pdf"
            onChange={handleFileUpload}
          />
        </Button>
      </ResizableBox>

      {/* 右侧区域：AI交互区 */}
      <Box
        sx={{
          padding: '20px',
          backgroundColor: '#fafafa',
          borderRadius: '10px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          //自动充满父容器
          flex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <SmartToyIcon color="primary" sx={{ marginRight: '10px' }} />
          <Typography variant="h5">
            AI交互区
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            border: '1px solid #ddd',
            padding: '10px',
            borderRadius: '8px',
            background: '#ffffff',
            overflowY: 'auto',
          }}
        >
          <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {aiResponse}
          </Typography>
        </Box>

        {/* 输入框和发送图标按钮 */}
        {/* flex默认是水平排布 */}
        {/* gap表示两个相邻组件之间的间距 */}
        <Box sx={{ marginTop: '20px', display: 'flex', gap: 2 }}>
          <TextField
            label="输入内容"
            variant="outlined"
            fullWidth
            size="small"
            placeholder="在这里输入想分析的内容"
            value={userQuestion}
            onChange={(e)=>setUserQuestion(e.target.value)}
          />
          <IconButton
            size="large"
            sx={{
              backgroundColor: '#1976d2',
              color: '#fff',
              ':hover': {
                backgroundColor: '#115293',
              },
            }}
            onClick={handleQuestionSubmit}
            //disabled=true时不能点击
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> :<ArrowForwardIcon sx={{ transform: 'rotate(-90deg)' }}/>}
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

export default App;
