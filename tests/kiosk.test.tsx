import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import KioskMainScreen from '@/components/kiosk/KioskMainScreen';

// Mock the Button component
jest.mock('@/components/shared/Button', () => {
  return function MockButton({ children, onClick, className, ...props }: any) {
    return (
      <button onClick={onClick} className={className} {...props}>
        {children}
      </button>
    );
  };
});

describe('KioskMainScreen', () => {
  it('renders main title', () => {
    render(<KioskMainScreen />);
    expect(screen.getByText('TRUNG TÂM HÀNH CHÍNH CÔNG')).toBeInTheDocument();
  });

  it('renders welcome message', () => {
    render(<KioskMainScreen />);
    expect(screen.getByText(/Chào mừng quý khách/)).toBeInTheDocument();
  });

  it('renders all service options', () => {
    render(<KioskMainScreen />);
    
    expect(screen.getByText('Cấp CCCD/CMND')).toBeInTheDocument();
    expect(screen.getByText('Đăng ký kinh doanh')).toBeInTheDocument();
    expect(screen.getByText('Khai thuế')).toBeInTheDocument();
    expect(screen.getByText('Bảo hiểm xã hội')).toBeInTheDocument();
    expect(screen.getByText('Giấy phép xây dựng')).toBeInTheDocument();
    expect(screen.getByText('Dịch vụ khác')).toBeInTheDocument();
  });

  it('renders quick action buttons', () => {
    render(<KioskMainScreen />);
    
    expect(screen.getByText('Tìm kiếm bằng giọng nói')).toBeInTheDocument();
    expect(screen.getByText('Hướng dẫn sử dụng')).toBeInTheDocument();
  });

  it('handles service selection', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    render(<KioskMainScreen />);
    
    const serviceCard = screen.getByText('Cấp CCCD/CMND').closest('div');
    fireEvent.click(serviceCard!);
    
    expect(consoleSpy).toHaveBeenCalledWith('Selected service:', '1');
    consoleSpy.mockRestore();
  });

  it('renders working hours information', () => {
    render(<KioskMainScreen />);
    
    expect(screen.getByText(/Giờ làm việc/)).toBeInTheDocument();
    expect(screen.getByText(/8:00 - 17:00/)).toBeInTheDocument();
  });

  it('renders support hotline', () => {
    render(<KioskMainScreen />);
    
    expect(screen.getByText(/Hotline hỗ trợ/)).toBeInTheDocument();
    expect(screen.getByText(/1900-1234/)).toBeInTheDocument();
  });

  it('all service cards have proper styling classes', () => {
    render(<KioskMainScreen />);
    
    const serviceCards = screen.getAllByText('Lấy số thứ tự');
    expect(serviceCards).toHaveLength(6);
    
    serviceCards.forEach(card => {
      const cardElement = card.closest('div');
      expect(cardElement).toHaveClass('cursor-pointer');
      expect(cardElement).toHaveClass('bg-white');
    });
  });
});
